import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPlatformMemberFileUploadsFileUploadId(props: {
  member: MemberPayload;
  fileUploadId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFileUpload.IUpdate;
}): Promise<ICommunityPlatformFileUpload> {
  const file =
    await MyGlobal.prisma.community_platform_file_uploads.findUniqueOrThrow({
      where: { id: props.fileUploadId },
    });
  if (file.uploaded_by_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: You can only update your own file uploads",
      403,
    );
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_file_uploads.update({
    where: { id: props.fileUploadId },
    data: {
      ...(props.body.original_filename !== undefined && {
        original_filename: props.body.original_filename,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.url !== undefined && { url: props.body.url }),
      updated_at: now,
      ...(props.body.status === "deleted" && { deleted_at: now }),
    },
  });
  const updated =
    await MyGlobal.prisma.community_platform_file_uploads.findUniqueOrThrow({
      where: { id: props.fileUploadId },
    });
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
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
