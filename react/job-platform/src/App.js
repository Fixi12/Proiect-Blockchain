import React, { useState, useEffect } from "react";
import { ethers, ZeroAddress } from "ethers";
import "./App.css";
import JobPlatformArtifact from "./JobPlatformABI.json";

const JobPlatformABI = JobPlatformArtifact.abi;
const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
let UsdConverted = ''; 
let currentAccount;

function App() {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("");
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", payment: "" });
  const [displayInUsd, setDisplayInUsd] = useState(false);
  const [ethBalance, setEthBalance] = useState(0);
  const [usdBalance, setUsdBalance] = useState(0);

  
  const connectWallet = async () => {
    if (window.ethereum) {
      const providerInstance = new ethers.BrowserProvider(window.ethereum);
      const accounts = await providerInstance.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      setProvider(providerInstance);

     
      const signer = await providerInstance.getSigner();
      currentAccount = accounts[0];
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, JobPlatformABI, signer);
      setContract(contractInstance);
    } else {
      alert("Please install MetaMask!");
    }
  };

  
  const fetchBalance = async () => {
    if (provider && account) {
      try {
        const balanceWei = await provider.getBalance(account);
        const balanceEth = ethers.formatEther(balanceWei);
        setEthBalance(balanceEth);
        if (displayInUsd) {
          setUsdBalance(await convertEthToUsd(balanceEth));
          toggleCurrency();
        }
      } catch (error) {
        console.error("Eroare la obtinerea balantei:", error);
      }
    }
  };

  
  const convertEthToUsd = async (ethAmount) => {
    if (contract) {
      try {
        const usdAmount = await contract.convertEthToUsd(ethers.parseUnits(ethAmount, "ether"));
        return usdAmount.toString();
      } catch (error) {
        console.error("Eroare la conversia ETH în USD:", error);
        return 0;
      }
    }
    return 0;
  };

 
  const toggleCurrency = async () => {
    if (displayInUsd) {
      setUsdBalance(0);
      UsdConverted = '';
    } else {
      UsdConverted += await convertEthToUsd(ethBalance); 
    }
    setDisplayInUsd(!displayInUsd);
  };

  
  const fetchJobs = async () => {
    if (contract) {
      try {
        const jobCounter = await contract.jobCounter();
        const jobs = [];
        for (let i = 1; i <= jobCounter; i++) {
          const job = await contract.jobs(i);
          const isEmployer = job.employer.toLowerCase() === currentAccount.toLowerCase();
          const isFreelancerZero = job.freelancer === ZeroAddress;
          const isJobActive = !job.isCompleted;
  
          const disableAplica = !isJobActive || !isFreelancerZero || isEmployer;
  
          const disableFinalizeaza = !isEmployer || isFreelancerZero || job.isCompleted;
  
          jobs.push({
            id: i,
            title: job.title,
            description: job.description,
            payment: job.payment,
            employer: job.employer,
            freelancer: job.freelancer,
            isCompleted: job.isCompleted,
            disableAplicaButton: disableAplica,
            disableFinalizeazaButton: disableFinalizeaza,
          });
        }
        setJobs(jobs);
      } catch (error) {
        console.error("Eroare la fetch-ul joburilor:", error);
      }
    }
  };

  const postJob = async () => {
    if (contract) {
      try {
        const paymentInWei = ethers.parseEther(form.payment);
        const tx = await contract.postJob(form.title, form.description, paymentInWei, {
          value: paymentInWei,
        });
        await tx.wait();
        fetchJobs();
        alert("Job postat cu succes!");
        fetchBalance();
      } catch (error) {
        console.error("Eroare la postarea jobului:", error);
        alert("A aparut o eroare la postarea jobului.");
      }
    } else {
      alert("Contractul nu este conectat.");
    }
  };

  const applyToJob = async (jobId) => {
    if (contract) {
      try {
        const tx = await contract.applyToJob(jobId);
        await tx.wait();
        fetchJobs();

      } catch (error) {
        console.error("Eroare la aplicare:", error);
      }
    }
  };


  const completeJob = async (jobId) => {
    if (contract) {
      try {
        const txComplete = await contract.completeJob(jobId);
        await txComplete.wait();

        const txRelease = await contract.releasePayment(jobId);
        await txRelease.wait();

        fetchJobs();
        alert("Job finalizat și plata a fost eliberata!");
      } catch (error) {
        console.error("Eroare la finalizarea jobului:", error);
      }
    }
  };


  useEffect(() => {
    if (account && provider) {
      fetchBalance();
    }
  }, [account, provider]);

 
  useEffect(() => {
    if (contract) {
      fetchJobs();
    }
  }, [contract]);

  return (
    <div className="App">
      <header>
        <h1>Platforma de Joburi</h1>
        <div>
          <button onClick={connectWallet}>
            {account ? `Conectat: ${account.slice(0, 6)}...${account.slice(-4)}` : "Conecteaza-te cu MetaMask"}
          </button>
          {account && (
            <p>
              <strong>Balanta:</strong> {displayInUsd ? `${UsdConverted} USD` : `${Number(ethBalance).toFixed(2)} ETH`}
            </p>
          )}
          {account && (
            <button onClick={toggleCurrency}>
              {displayInUsd ? "Arata în ETH" : "Arata în USD"}
            </button>
          )}
        </div>
      </header>

      <section>
        <h2>Posteaza un Job</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            postJob();
          }}
        >
          <input
            type="text"
            placeholder="Titlu job"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <textarea
            placeholder="Descriere job"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Plata în ETH"
            value={form.payment}
            onChange={(e) => setForm({ ...form, payment: e.target.value })}
            required
          />
          <button type="submit">Postează</button>
        </form>
      </section>

      <section>
        <h2>Lista Joburilor</h2>
        {jobs.length === 0 ? (
          <p>Niciun job disponibil</p>
        ) : (
          <ul>
            {jobs.map((job) => (
              <li key={job.id}>
                <h3>{job.title}</h3>
                <p>{job.description}</p>
                <p>
                  Payment: {job.payment ? `${ethers.formatEther(job.payment)} ETH` : "Not specified"}
                </p>
                <p>Employer: {job.employer}</p>
                <p>
                  Freelancer: {job.freelancer === ZeroAddress ? "N/A" : job.freelancer}
                </p>
                {job.disableAplicaButton == false && (
                  <button onClick={() => applyToJob(job.id)}>Aplică</button>
                )}
                {job.disableFinalizeazaButton == false && (
                  <button onClick={() => completeJob(job.id)}>Finalizează</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default App;
