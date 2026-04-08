import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneFileAssociationAtResponseTransformer } from "../transformers/RedditCloneFileAssociationAtResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberAvatars(props: {
  member: MemberPayload;
  body: IRedditCloneFileAssociation.ICreate;
}): Promise<IRedditCloneFileAssociation.IResponse> {
  // 1. Find user's profile
  const profile = await MyGlobal.prisma.reddit_clone_user_profiles.findUnique({
    where: { reddit_clone_member_id: props.member.id },
    select: { id: true, reddit_clone_file_association_id: true },
  });
  if (profile === null) {
    throw new HttpException("User profile not found", 404);
  }
  // 2. Decode and validate image
  const base64Data = props.body.imageData;
  const decodedBuffer = Buffer.from(base64Data, "base64");
  // 3. Extract MIME type from magic bytes
  const mimeType = extractMimeType(decodedBuffer);
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(mimeType)) {
    throw new HttpException(
      "Invalid image format. Supported: JPEG, PNG, GIF, WebP",
      400,
    );
  }
  // 4. Validate file size (5MB)
  const maxSize = 5 * 1024 * 1024;
  if (decodedBuffer.length > maxSize) {
    throw new HttpException("File size exceeds 5MB limit", 400);
  }
  // 5. Generate file ID and stored filename
  const fileId: string & tags.Format<"uuid"> = v4();
  const extension = getExtensionFromMimeType(mimeType);
  const storedFilename = `${fileId}.${extension}`;
  const originalFilename = props.body.filename ?? "avatar";
  // 6. Create file record
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  await MyGlobal.prisma.reddit_clone_files.create({
    data: {
      id: fileId,
      uploader_id: props.member.id,
      original_filename: originalFilename,
      stored_filename: storedFilename,
      mime_type: mimeType,
      file_size: decodedBuffer.length,
      storage_path: `/uploads/files/${storedFilename}`,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 7. Delete existing avatar association
  if (profile.reddit_clone_file_association_id !== null) {
    await MyGlobal.prisma.reddit_clone_file_associations.deleteMany({
      where: { target_type: "user", target_id: profile.id },
    });
  }
  // 8. Create new file association
  const associationId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.reddit_clone_file_associations.create({
    data: {
      id: associationId,
      reddit_clone_file_id: fileId,
      target_type: "user",
      target_id: profile.id,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 9. Update profile
  await MyGlobal.prisma.reddit_clone_user_profiles.update({
    where: { id: profile.id },
    data: {
      reddit_clone_file_association_id: associationId,
      updated_at: new Date(),
    },
  });
  // 10. Fetch and return response
  const record =
    await MyGlobal.prisma.reddit_clone_file_associations.findUniqueOrThrow({
      where: { id: associationId },
      ...RedditCloneFileAssociationAtResponseTransformer.select(),
    });
  return await RedditCloneFileAssociationAtResponseTransformer.transform(
    record,
  );
}
function extractMimeType(buffer: Buffer): string {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return "image/jpeg";
  }
  if (buffer.length >= 8) {
    const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (PNG.every((b, i) => buffer[i] === b)) return "image/png";
  }
  if (buffer.length >= 6) {
    const GIF1 = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61];
    const GIF2 = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
    if (
      GIF1.every((b, i) => buffer[i] === b) ||
      GIF2.every((b, i) => buffer[i] === b)
    ) {
      return "image/gif";
    }
  }
  if (buffer.length >= 12) {
    const riff = buffer.slice(0, 4).toString("ascii");
    const webp = buffer.slice(8, 12).toString("ascii");
    if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  }
  return "application/octet-stream";
}
function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
  };
  return map[mimeType] ?? "bin";
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCloneMemberAvatars(props: {
//   member: MemberPayload;
//   body: IRedditCloneFileAssociation.ICreate;
// }): Promise<IRedditCloneFileAssociation.IResponse> {
//   const record = await MyGlobal.prisma.reddit_clone_file_associations.findFirstOrThrow({
//     ...RedditCloneFileAssociationAtResponseTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCloneFileAssociationAtResponseTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------