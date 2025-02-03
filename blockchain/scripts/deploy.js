const hre = require("hardhat");

async function main() {
  // Pas 1: Deploy EthUsdConverter
  const EthUsdConverter = await hre.ethers.getContractFactory("EthUsdConverter");
  const converter = await EthUsdConverter.deploy();
  await converter.waitForDeployment();
  console.log("EthUsdConverter deployed to:", converter.target);

  // Pas 2: Deploy JobPlatform cu adresa EthUsdConverter
  const JobPlatform = await hre.ethers.getContractFactory("JobPlatform");
  const jobPlatform = await JobPlatform.deploy(converter.target); // Trimite adresa ca argument
  await jobPlatform.waitForDeployment();
  console.log("JobPlatform deployed to:", jobPlatform.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});