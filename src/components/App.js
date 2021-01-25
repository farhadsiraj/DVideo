import React, { Component } from "react";
import DVideo from "../abis/DVideo.json";
import Navbar from "./Navbar";
import Main from "./Main";
import Web3 from "web3";
import "./App.css";

//Declare IPFS
const ipfsClient = require("ipfs-http-client");
const ipfs = ipfsClient({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
}); // leaving out the arguments will default to these values

class App extends Component {
  constructor(props) {
    super(props);

    //set states
    this.state = {
      buffer: null,
      account: "",
      dvideo: null,
      videos: [],
      //loading default should be true (change after fixing promise error)
      loading: true,
      currentHash: null,
      currentTitle: null,
    };

    //Bind functions
    this.uploadVideo = this.uploadVideo.bind(this);
    this.captureFile = this.captureFile.bind(this);
    this.changeVideo = this.changeVideo.bind(this);
  }
  // async componentWillMount() {
  //   await this.loadWeb3();
  //   await this.loadBlockchainData();
  // }
  async componentDidMount() {
    await this.loadWeb3();
    await this.loadBlockchainData();
  }

  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum);
      await window.ethereum.enable();
    } else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider);
    } else {
      window.alert(
        "Non-Ethereum browser detected. You should consider trying MetaMask!"
      );
    }
  }

  async loadBlockchainData() {
    const web3 = window.web3;
    //Load accounts
    //Add first account to the state
    const accounts = await web3.eth.getAccounts();
    console.log(accounts);
    this.setState({ account: accounts[0] });
    //Get network ID
    const networkId = await web3.eth.net.getId();
    //Get network data
    const networkData = DVideo.networks[networkId];
    //Check if net data exists, then
    if (networkData) {
      // Get and add dvideo contract to the state
      const dvideo = new web3.eth.Contract(DVideo.abi, networkData.address);
      this.setState({ dvideo });
      console.log(dvideo);

      // // Get and add videoCounts to the state
      const videosCount = await dvideo.methods.videoCount().call();
      this.setState({ videosCount });

      // //Iterate throught videos and add them to the state (by newest)
      for (let i = videosCount; i >= 1; i--) {
        const video = await dvideo.methods.videos(i).call();
        this.setState({
          videos: [...this.state.videos, video],
        });
      }

      // //Set latest video and it's title to view as default
      const latest = await dvideo.methods.videos(videosCount).call();
      this.setState({
        currentHash: latest.hash,
        currentTitle: latest.title,
      });

      this.setState({ loading: false });
    } else {
      //If network data doesn't exist, log error
      window.alert("DVideo contract not deployed to detected network.");
    }

    //Set loading state to false
  }

  //Get video
  captureFile = (event) => {
    event.preventDefault();
    const file = event.target.files[0];
    const reader = new window.FileReader();
    reader.readAsArrayBuffer(file);

    reader.onloadend = () => {
      this.setState({ buffer: Buffer(reader.result) });
      console.log("buffer", this.state.buffer);
    };
  };

  //Upload video
  uploadVideo = (title) => {
    console.log("Submitting file to IPFS...");

    // Add to IPFS
    ipfs.add(this.state.buffer, (error, result) => {
      console.log("IPFS result", result);
      if (error) {
        console.log(error);
        return;
      }

      this.setState({ loading: true });
      this.state.dvideo.methods
        .uploadVideo(result[0].hash, title)
        .send({ from: this.state.account })
        .on("transactionHash", (hash) => {
          this.setState({ loading: false });
        });
    });
  };

  //Change Video
  changeVideo = (hash, title) => {
    this.setState({ currentHash: hash });
    this.setState({ currentTitle: title });
  };

  render() {
    return (
      <div>
        <Navbar account={this.state.account} />
        {this.state.loading ? (
          <div id="loader" className="text-center mt-5">
            <p>Loading...</p>
          </div>
        ) : (
          <Main
            videos={this.state.videos}
            captureFile={this.captureFile}
            uploadVideo={this.uploadVideo}
            changeVideo={this.changeVideo}
            currentHash={this.state.currentHash}
            currentTitle={this.state.currentTitle}
          />
        )}
      </div>
    );
  }
}

export default App;
