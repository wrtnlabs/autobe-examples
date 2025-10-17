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

export async function postCommunityPlatformMemberFileUploads(props: {
  member: MemberPayload;
  body: ICommunityPlatformFileUpload.ICreate;
}): Promise<ICommunityPlatformFileUpload> {
  const { member, body } = props;

  // Validate that member is active and not deleted
  const dbMember = await MyGlobal.prisma.community_platform_members.findFirst({
    where: {
      id: member.id,
      status: "active",
      deleted_at: null,
    },
  });
  if (!dbMember) {
    throw new HttpException(
      "Forbidden: Member is not active or has been deleted",
      403,
    );
  }

  // Create new file upload record with metadata
  const now = toISOStringSafe(new Date());
  const fileUpload =
    await MyGlobal.prisma.community_platform_file_uploads.create({
      data: {
        id: v4(),
        uploaded_by_member_id: member.id,
        original_filename: body.original_filename,
        storage_key: body.storage_key,
        mime_type: body.mime_type,
        file_size_bytes: body.file_size_bytes,
        url: body.url,
        status: body.status,
        created_at: now,
        updated_at: now,
      },
    });

  // Return DTO-compliant response, convert Date fields
  return {
    id: fileUpload.id,
    uploaded_by_member_id: fileUpload.uploaded_by_member_id,
    original_filename: fileUpload.original_filename,
    storage_key: fileUpload.storage_key,
    mime_type: fileUpload.mime_type,
    file_size_bytes: fileUpload.file_size_bytes,
    url: fileUpload.url,
    status: fileUpload.status,
    created_at: toISOStringSafe(fileUpload.created_at),
    updated_at: toISOStringSafe(fileUpload.updated_at),
    deleted_at: fileUpload.deleted_at
      ? toISOStringSafe(fileUpload.deleted_at)
      : undefined,
  };
}
