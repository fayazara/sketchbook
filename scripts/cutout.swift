// Removes the background from a photo using macOS's on-device subject lifting
// (Vision, macOS 14+). Writes a PNG with a transparent background.
//
//   swift scripts/cutout.swift input.jpg output.png
//
// Then turn the cutout into a sticker:  node scripts/sticker.mjs output.png public/stickers/name.webp
import AppKit
import CoreImage
import Vision

let args = CommandLine.arguments
guard args.count == 3 else {
	FileHandle.standardError.write(Data("usage: swift cutout.swift <input> <output.png>\n".utf8))
	exit(2)
}

let handler = VNImageRequestHandler(url: URL(fileURLWithPath: args[1]))
let request = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([request])
guard let observation = request.results?.first else {
	FileHandle.standardError.write(Data("no subject found in \(args[1])\n".utf8))
	exit(1)
}

let pixels = try observation.generateMaskedImage(
	ofInstances: observation.allInstances,
	from: handler,
	croppedToInstancesExtent: false
)
let context = CIContext()
try context.writePNGRepresentation(
	of: CIImage(cvPixelBuffer: pixels),
	to: URL(fileURLWithPath: args[2]),
	format: .RGBA8,
	colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!
)
