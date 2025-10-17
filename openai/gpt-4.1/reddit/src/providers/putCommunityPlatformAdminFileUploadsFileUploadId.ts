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

export async function putCommunityPlatformAdminFileUploadsFileUploadId(props: {
  admin: AdminPayload;
  fileUploadId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFileUpload.IUpdate;
}): Promise<ICommunityPlatformFileUpload> {
  // Find the existing file upload, throw 404 if not found
  const file = await MyGlobal.prisma.community_platform_file_uploads.findUnique(
    {
      where: { id: props.fileUploadId },
    },
  );
  if (!file) {
    throw new HttpException("File upload not found", 404);
  }

  // Validate business logic for status
  const allowedStatus = ["active", "deleted", "archived"];
  if (
    props.body.status !== undefined &&
    !allowedStatus.includes(props.body.status)
  ) {
    throw new HttpException("Invalid status value", 400);
  }

  // Prepare now timestamp for updated_at
  const now = toISOStringSafe(new Date());

  // Update only allowed fields (original_filename, status, url)
  const updated = await MyGlobal.prisma.community_platform_file_uploads.update({
    where: { id: props.fileUploadId },
    data: {
      original_filename: props.body.original_filename ?? undefined,
      status: props.body.status ?? undefined,
      url: props.body.url ?? undefined,
      updated_at: now,
    },
  });

  // Compose API response (convert all date fields, return exactly what ICommunityPlatformFileUpload expects)
  return {
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
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
