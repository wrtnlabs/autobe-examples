import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminFileUploadsFileUploadId(props: {
  admin: AdminPayload;
  fileUploadId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformFileUpload> {
  const { fileUploadId } = props;
  const file = await MyGlobal.prisma.community_platform_file_uploads.findUnique(
    {
      where: { id: fileUploadId },
    },
  );
  if (!file) {
    throw new HttpException("File upload not found", 404);
  }
  return {
    id: file.id,
    uploaded_by_member_id: file.uploaded_by_member_id,
    original_filename: file.original_filename,
    storage_key: file.storage_key,
    mime_type: file.mime_type,
    file_size_bytes: file.file_size_bytes,
    url: file.url,
    status: file.status,
    created_at: toISOStringSafe(file.created_at),
    updated_at: toISOStringSafe(file.updated_at),
    deleted_at:
      file.deleted_at !== null && file.deleted_at !== undefined
        ? toISOStringSafe(file.deleted_at)
        : null,
  };
}
