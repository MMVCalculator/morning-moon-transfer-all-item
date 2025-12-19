const ethers = require('ethers');

const HTTP_PROVIDER_LINK = "https://rpc.bitkubchain.io"
const provider = new ethers.providers.JsonRpcProvider(HTTP_PROVIDER_LINK);

const privateKey = "{PRIVATE-KEY}";
const transferToAddress = "0x000000"

const wallet = new ethers.Wallet(privateKey, provider)

const Contract = {
    MMI: new ethers.Contract("0xd08Ac40b3a0A7fb20b026A3b6Cd5D7cFadc3d6f5", [
        "function balanceOf(address owner) external view returns (uint256 balance)",
        "function tokenOfOwnerAll(address _owner) external view returns (uint256[] memory)",
        "function tokenURI(uint256 tokenId) external view returns (string memory)",
        "function transferFrom(address from, address to, uint256 tokenId) external"
    ], wallet)
}

async function balanceOf(address) {
    return await Contract.MMI.balanceOf(address);
}

async function tokenOfOwnerAll(address) {
    return await Contract.MMI.tokenOfOwnerAll(address);
}

async function transferFrom(fromAddress, toAddress, tokenId) {
    return await Contract.MMI.transferFrom(fromAddress, toAddress, tokenId);
}

async function main() {

    const getTokenOfOwnerAll = await tokenOfOwnerAll(wallet.address);
    console.log(`Total [${getTokenOfOwnerAll.length}]`);

    for (let i = 0; i < getTokenOfOwnerAll.length ; i++) {
        const trx = await transferFrom(wallet.address, transferToAddress, getTokenOfOwnerAll[i].toString());

        console.log('Sending...\nTransaction hash: ', trx.hash);
        console.log('Waiting transaction to be confirmed...');

        await trx.wait();
        console.log('Transaction confirmed');
    }
}

main()