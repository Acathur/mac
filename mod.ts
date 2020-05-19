import { exec } from 'https://deno.land/x/execute/mod.ts'
import { MAC_OSX_START_LINE, MAC_LINUX_START_LINE, MAC_RE, MAC_IP_RE } from './constant.ts'

const getInterfaceName = () => {
	switch (Deno.build.os) {
		case 'darwin':
			return 'en'

		case 'windows':
			return null

		default:
			return 'eth'
	}
}

const getIfconfigCmd = () => {
	if (Deno.build.os === 'windows') {
		return 'ipconfig/all'
	}

	return '/sbin/ifconfig'
}

const getMacByIfconfig = (content: string, interfaceName: string) => {
	const lines = content.split('\n')
	const macList: string[] = []

	for (let i = 0; i < lines.length; i++) {
		let line = lines[i].trimRight()
		const m = MAC_OSX_START_LINE.exec(line) || MAC_LINUX_START_LINE.exec(line)

		if (!m) {
			continue
		}

		// check interface name
		const name = m[1]

		if (name.indexOf(interfaceName) !== 0) {
			continue
		}

		let ip = null
		let mac = null
		let match = MAC_RE.exec(line)

		if (match) {
			mac = match[1]
		}

		i++
		while (true) {
			line = lines[i]

			if (!line || MAC_OSX_START_LINE.exec(line) || MAC_LINUX_START_LINE.exec(line)) {
				i--
				break // hit next interface, handle next interface
			}

			if (!mac) {
				match = MAC_RE.exec(line)
				if (match) {
					mac = match[1]
				}
			}

			if (!ip) {
				match = MAC_IP_RE.exec(line)
				if (match) {
					ip = match[1]
				}
			}

			i++
		}

		if (ip && mac) {
			return mac
		}
		else if (mac) {
			macList.push(mac)
		}
	}

	console.debug(macList)

	return macList[0] || null
}

export const getMac = async (interfaceName?: string) => {
	try {
		const ifconfig = await exec(getIfconfigCmd())

		if (ifconfig) {
			return getMacByIfconfig(ifconfig, interfaceName || getInterfaceName() || '')
		}
	}
	catch (e) {
		console.warn(e)
	}

	return null
}
