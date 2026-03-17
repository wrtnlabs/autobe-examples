import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTempUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformTempUploadCollector } from "../collectors/CommunityPlatformTempUploadCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformTempUploadTransformer } from "../transformers/CommunityPlatformTempUploadTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberFilesUpload(props: {
  member: MemberPayload;
  body: ICommunityPlatformTempUpload.ICreate;
}): Promise<ICommunityPlatformTempUpload> {
  // Verify the referenced file exists and belongs to the authenticated member
  const file = await MyGlobal.prisma.community_platform_files.findUniqueOrThrow(
    {
      where: { id: props.body.communityPlatformFileId },
      select: {
        id: true,
        type: true,
        size: true,
        status: true,
        actor_type: true,
        actor_id: true,
      },
    },
  );
  // Validate file ownership
  if (file.actor_type !== "member" || file.actor_id !== props.member.id) {
    throw new HttpException(
      "File does not belong to authenticated member",
      403,
    );
  }
  // Validate file status is acceptable for attachment
  if (file.status !== "completed" && file.status !== "uploaded") {
    throw new HttpException(
      `File status '${file.status}' is not acceptable for attachment`,
      400,
    );
  }
  // Validate MIME type against allowed image formats
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif"];
  if (!allowedMimeTypes.includes(file.type)) {
    throw new HttpException(
      `File type '${file.type}' is not supported. Allowed: ${allowedMimeTypes.join(", ")}`,
      415,
    );
  }
  // Validate file size meets requirements (e.g., max 10MB for images)
  const maxFileSizeBytes = 10 * 1024 * 1024; // 10MB
  if (file.size > maxFileSizeBytes) {
    throw new HttpException(
      `File size ${file.size} bytes exceeds maximum ${maxFileSizeBytes} bytes`,
      413,
    );
  }
  // Create temporary upload record using collector
  const session = { id: props.member.session_id };
  const created = await MyGlobal.prisma.community_platform_temp_uploads.create({
    data: await CommunityPlatformTempUploadCollector.collect({
      body: props.body,
      member: props.member,
      session,
    }),
    ...CommunityPlatformTempUploadTransformer.select(),
  });
  // Transform and return response
  return await CommunityPlatformTempUploadTransformer.transform(created);
}
