import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putCommunityPlatformModeratorFileUploadsFileUploadId(props: {
  moderator: ModeratorPayload;
  fileUploadId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFileUpload.IUpdate;
}): Promise<ICommunityPlatformFileUpload> {
  // Find the file upload by ID
  const file = await MyGlobal.prisma.community_platform_file_uploads.findUnique(
    {
      where: { id: props.fileUploadId },
    },
  );
  if (!file) {
    throw new HttpException("File upload not found", 404);
  }

  // Update allowed fields only
  const updated = await MyGlobal.prisma.community_platform_file_uploads.update({
    where: { id: props.fileUploadId },
    data: {
      original_filename: props.body.original_filename ?? undefined,
      status: props.body.status ?? undefined,
      url: props.body.url ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  const result: ICommunityPlatformFileUpload = {
    id: updated.id,
    uploaded_by_member_id: updated.uploaded_by_member_id,
    original_filename: updated.original_filename,
    storage_key: updated.storage_key,
    mime_type: updated.mime_type,
    file_size_bytes: updated.file_size_bytes,
    url: updated.url,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    ...(updated.deleted_at != null && {
      deleted_at: toISOStringSafe(updated.deleted_at),
    }),
  };
  return result;
}
