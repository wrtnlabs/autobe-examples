import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAttachmentFile";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postEconomicForumUserAttachmentFiles(props: {
  user: UserPayload;
  body: IEconomicForumAttachmentFile.ICreate;
}): Promise<IEconomicForumAttachmentFile> {
  // Decode base64 to extract file metadata
  const buffer = Buffer.from(props.body.file_data, "base64");
  const mimeHex = buffer.slice(0, 4).toString("hex");
  let mimeType = "application/octet-stream";
  if (mimeHex.startsWith("8950")) mimeType = "image/png";
  else if (mimeHex.startsWith("4749")) mimeType = "image/gif";
  else if (mimeHex.startsWith("ffd8")) mimeType = "image/jpeg";
  else if (mimeHex.startsWith("504b")) mimeType = "application/zip";
  else if (mimeHex.startsWith("5261"))
    mimeType = "application/x-rar-compressed";
  const originalFileName = "unknown_file";
  const hashedFileName = v4() + "." + mimeType.split("/")[1];
  const fileSize = buffer.length;
  // Create file record with extracted metadata
  const created = await MyGlobal.prisma.economic_forum_attachment_files.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      hashed_filename: hashedFileName,
      original_filename: originalFileName,
      mime_type: mimeType,
      size: fileSize,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
  // Return minimal response as per DTO
  return {
    id: created.id,
  };
}
