const DEFAULT_ABI = [
  "function balanceOf(address owner) external view returns (uint256 balance)",
  "function tokenOfOwnerAll(address _owner) external view returns (uint256[] memory)",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function transferFrom(address from, address to, uint256 tokenId) external",
];

const BITKUB_NEXT_LOGIN_URL = "https://app.bitkubnext.com/oauth/login?redirect=/";

const state = {
  provider: null,
  wallet: null,
  walletAddress: null,
  contract: null,
  tokens: [],
};

const elements = {
  contractAddress: document.getElementById("contractAddress"),
  connectMetamask: document.getElementById("connectMetamask"),
  connectBitkub: document.getElementById("connectBitkub"),
  walletStatus: document.getElementById("walletStatus"),
  balanceAddress: document.getElementById("balanceAddress"),
  balanceButton: document.getElementById("balanceButton"),
  balanceResult: document.getElementById("balanceResult"),
  ownerAddress: document.getElementById("ownerAddress"),
  tokensButton: document.getElementById("tokensButton"),
  tokensResult: document.getElementById("tokensResult"),
  transferTo: document.getElementById("transferTo"),
  transferAllButton: document.getElementById("transferAllButton"),
  transferLog: document.getElementById("transferLog"),
};

const logMessage = (element, message, type = "info") => {
  const line = document.createElement("p");
  line.className = `log ${type}`;
  line.textContent = message;
  element.prepend(line);
};

const resetTokens = () => {
  state.tokens = [];
  elements.tokensResult.innerHTML = "";
};

const ensureConnected = () => {
  if (!state.contract || !state.wallet) {
    throw new Error("กรุณาเชื่อมต่อ Wallet ก่อน");
  }
};

const renderTokens = () => {
  elements.tokensResult.innerHTML = "";
  if (state.tokens.length === 0) {
    elements.tokensResult.textContent = "ไม่พบ Token";
    return;
  }

  const list = document.createElement("ul");
  list.className = "token-list";

  state.tokens.forEach((tokenId) => {
    const item = document.createElement("li");
    item.className = "token-item";

    const label = document.createElement("span");
    label.textContent = `Token ID: ${tokenId}`;

    const transferButton = document.createElement("button");
    transferButton.textContent = "โอน Token นี้";
    transferButton.addEventListener("click", async () => {
      await transferSingleToken(tokenId);
    });

    item.append(label, transferButton);
    list.appendChild(item);
  });

  elements.tokensResult.appendChild(list);
};

const getInjectedProvider = (walletType) => {
  if (walletType === "metamask") {
    if (window.ethereum && window.ethereum.isMetaMask) {
      return window.ethereum;
    }
    return null;
  }

  if (walletType === "bitkub") {
    if (window.bitkub) {
      return window.bitkub;
    }
    if (window.bitkubNext) {
      return window.bitkubNext;
    }
    return null;
  }

  return null;
};

const connectInjectedWallet = async (walletType) => {
  try {
    const contractAddress = elements.contractAddress.value.trim();
    if (!contractAddress) {
      elements.walletStatus.textContent = "กรุณากรอก Contract Address";
      return;
    }

    const injectedProvider = getInjectedProvider(walletType);
    if (!injectedProvider) {
      elements.walletStatus.textContent =
        walletType === "metamask"
          ? "ไม่พบ MetaMask ในเบราว์เซอร์"
          : "ไม่พบ Bitkub Next ในเบราว์เซอร์";
      return;
    }

    const provider = new ethers.providers.Web3Provider(injectedProvider, "any");
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const walletAddress = await signer.getAddress();
    const contract = new ethers.Contract(contractAddress, DEFAULT_ABI, signer);

    state.provider = provider;
    state.wallet = signer;
    state.walletAddress = walletAddress;
    state.contract = contract;

    elements.walletStatus.textContent = `เชื่อมต่อสำเร็จ: ${walletAddress}`;
    elements.balanceAddress.value = walletAddress;
    elements.ownerAddress.value = walletAddress;
  } catch (error) {
    elements.walletStatus.textContent = error.message;
  }
};

const handleBalance = async () => {
  try {
    ensureConnected();
    const address = elements.balanceAddress.value.trim();
    const balance = await state.contract.balanceOf(address);
    elements.balanceResult.textContent = `Balance: ${balance.toString()}`;
  } catch (error) {
    elements.balanceResult.textContent = error.message;
  }
};

const handleTokens = async () => {
  try {
    ensureConnected();
    const address = elements.ownerAddress.value.trim();
    resetTokens();
    const tokens = await state.contract.tokenOfOwnerAll(address);
    state.tokens = tokens.map((token) => token.toString());
    renderTokens();
  } catch (error) {
    elements.tokensResult.textContent = error.message;
  }
};

const transferSingleToken = async (tokenId) => {
  try {
    ensureConnected();
    const toAddress = elements.transferTo.value.trim();
    if (!toAddress) {
      logMessage(elements.transferLog, "กรุณากรอกที่อยู่ปลายทาง", "error");
      return;
    }
    logMessage(elements.transferLog, `กำลังส่ง Token ID: ${tokenId}`, "info");
    const trx = await state.contract.transferFrom(state.walletAddress, toAddress, tokenId);
    logMessage(elements.transferLog, `Transaction hash: ${trx.hash}`, "info");
    await trx.wait();
    logMessage(elements.transferLog, `ยืนยันเรียบร้อย Token ID: ${tokenId}`, "success");
  } catch (error) {
    logMessage(elements.transferLog, error.message, "error");
  }
};

const transferAllTokens = async () => {
  try {
    ensureConnected();
    const toAddress = elements.transferTo.value.trim();
    if (!toAddress) {
      logMessage(elements.transferLog, "กรุณากรอกที่อยู่ปลายทาง", "error");
      return;
    }
    if (state.tokens.length === 0) {
      logMessage(elements.transferLog, "ยังไม่มีรายการ Token กรุณาดึงรายการก่อน", "error");
      return;
    }
    for (const tokenId of state.tokens) {
      await transferSingleToken(tokenId);
    }
  } catch (error) {
    logMessage(elements.transferLog, error.message, "error");
  }
};

elements.connectMetamask.addEventListener("click", async () => {
  await connectInjectedWallet("metamask");
});

elements.connectBitkub.addEventListener("click", async () => {
  elements.walletStatus.textContent = "กำลังพาไปยัง Bitkub Next...";
  window.location.href = BITKUB_NEXT_LOGIN_URL;
});

elements.balanceButton.addEventListener("click", handleBalance);

elements.tokensButton.addEventListener("click", handleTokens);


elements.transferAllButton.addEventListener("click", transferAllTokens);
