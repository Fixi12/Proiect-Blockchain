pragma solidity ^0.8.0;

contract EthUsdConverter {
    function convertEthToUsd(uint256 ethAmount) external pure returns (uint256) {
        return ethAmount * 1600;
    }
}

contract JobPlatform {
    struct Job {
        string title;
        string description;
        uint256 payment;
        address employer;
        address freelancer;
        bool isCompleted;
        bool disableAplicaButton;
        bool disableFinalizeazaButton;
    }

    EthUsdConverter public converter;

    constructor(address _converterAddress) {
        converter = EthUsdConverter(_converterAddress);
    }

    mapping(uint256 => Job) public jobs;
    uint256 private _jobCounter;

    event JobPosted(uint256 jobId, string title, address indexed employer, uint256 payment);
    event JobApplied(uint256 jobId, address indexed freelancer);
    event JobCompleted(uint256 jobId, address indexed employer, address indexed freelancer);
    event PaymentReleased(uint256 jobId, address indexed freelancer, uint256 amount);

    function jobCounter() public view returns (uint256) {
        return _jobCounter;
    }

    modifier onlyEmployer(uint256 jobId) {
        require(jobs[jobId].employer == msg.sender, "Not the employer of this job");
        _;
    }

    modifier jobExists(uint256 jobId) {
        require(jobId > 0 && jobId <= _jobCounter, "Job does not exist");
        _;
    }

    function postJob(string memory _title, string memory _description, uint256 _payment) external payable {
        require(msg.value == _payment, "Payment must match the specified amount");

        _jobCounter++;
        jobs[_jobCounter] = Job({
            title: _title,
            description: _description,
            payment: _payment,
            employer: msg.sender,
            freelancer: address(0),
            isCompleted: false,
            disableAplicaButton: false,
            disableFinalizeazaButton: false
        });

        emit JobPosted(_jobCounter, _title, msg.sender, _payment);
    }

    function convertEthToUsd(uint256 ethAmount) public view returns (uint256) {
        return converter.convertEthToUsd(ethAmount);
    }

    function applyToJob(uint256 _jobId) external jobExists(_jobId) {
        require(jobs[_jobId].freelancer == address(0), "Job already taken");
        require(jobs[_jobId].employer != msg.sender, "Employer cannot apply to their own job");
        require(!jobs[_jobId].isCompleted, "Job is already completed");

        jobs[_jobId].freelancer = msg.sender;
        emit JobApplied(_jobId, msg.sender);
    }

    function completeJob(uint256 _jobId) external onlyEmployer(_jobId) jobExists(_jobId) {
        Job storage job = jobs[_jobId];
        require(!job.isCompleted, "Job already completed");
        require(job.freelancer != address(0), "No freelancer assigned");

        job.isCompleted = true;
        emit JobCompleted(_jobId, msg.sender, job.freelancer);
    }

    function _releasePaymentTo(address _recipient, uint256 _amount) internal {
        require(address(this).balance >= _amount, "Insufficient contract balance");
        payable(_recipient).transfer(_amount);
    }

    function releasePayment(uint256 _jobId) external onlyEmployer(_jobId) jobExists(_jobId) {
        Job storage job = jobs[_jobId];
        require(job.isCompleted, "Job must be marked as completed");
        _releasePaymentTo(job.freelancer, job.payment);
        emit PaymentReleased(_jobId, job.freelancer, job.payment);
    }
}