import { NodeSSH } from 'node-ssh';
import { readFileSync, PathLike, fstat } from 'fs';
import * as path from 'path';

export type EC2Connection = {
  host: string;
  username: string;
  privateKeyPath: PathLike;
};

export class SshConnection {
  host: any;
  username: any;
  privateKeyPath: PathLike;
  ssh: NodeSSH = new NodeSSH();

  constructor(data: EC2Connection) {
    this.host = data.host;
    this.username = data.username;
    this.privateKeyPath = data.privateKeyPath;
  }

  createConnection(): Promise<NodeSSH> {
    return this.ssh.connect({
      host: this.host,
      username: this.username,
      privateKey: readFileSync(this.privateKeyPath, 'utf8'),
    });
  }

  putLoadTestingFolder(localDirectory: string) {
    return this.ssh.putDirectory(localDirectory, `/home/ubuntu/loadTesting`, {
      recursive: true,
      concurrency: 10,
      // ^ WARNING: Not all servers support high concurrency
      // try a bunch of values and see what works on your server
      validate: function (itemPath) {
        const baseName = path.basename(itemPath);
        return (
          baseName.substr(0, 1) !== '.' && // do not allow dot files
          baseName !== 'node_modules'
        ); // do not allow node_modules
      },
      tick: function (localPath, remotePath, error) {
        if (error) {
          throw new Error(error.message);
        }
      },
    });
  }
  putFile(requirementFilePath: string) {
    return this.ssh.putFile(requirementFilePath, `/home/ubuntu/loadtesting/loadTesting.sh`);
  }

  async startLoadTesting(loadTestingScriptPath: PathLike, scriptFileName: string) {
    await this.executeCommand();
    return this.ssh.execCommand(
      `cd ${loadTestingScriptPath} && artillery run --output ${this.host}.report.json ${scriptFileName} >> ${this.host}.artillery.log.log`,
    );
  }
  private executeCommand() {
    return this.ssh.execCommand('cd loadtesting  && chmod +x loadTesting.sh && ./loadTesting.sh');
  }
  private getFile(type: string) {
    return this.ssh.getFile(
      `${__dirname}/${this.host}.report.json`,
      `/home/ubuntu/loadtesting/loadtestingfiles/${this.host}.${type}.json`,
    );
  }
}
