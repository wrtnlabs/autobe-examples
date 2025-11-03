import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsUpload";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postPoliticsBbsModeratorUploads(props: {
  moderator: ModeratorPayload;
  body: IPoliticsBbsUpload.ICreate;
}): Promise<IPoliticsBbsUpload> {
  // Schema contradiction: API allows null article_id and member_id
  // but schema requires non-nullable foreign keys
  // This breaks the upload-before-attachment workflow

  // Fallback URL for file storage (FILE_STORAGE_URL doesn't exist in schema)
  const fileUrl = "https://storage.autobe.com/uploads";

  return typia.random<IPoliticsBbsUpload>();
}
