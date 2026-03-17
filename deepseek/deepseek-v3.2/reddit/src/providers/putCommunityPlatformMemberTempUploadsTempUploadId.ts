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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformTempUploadTransformer } from "../transformers/CommunityPlatformTempUploadTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberTempUploadsTempUploadId(props: {
  member: MemberPayload;
  tempUploadId: string & tags.Format<"uuid">;
  body: ICommunityPlatformTempUpload.IUpdate;
}): Promise<ICommunityPlatformTempUpload> {
  // First, check if temp upload exists and belongs to member
  const tempUpload =
    await MyGlobal.prisma.community_platform_temp_uploads.findUniqueOrThrow({
      where: { id: props.tempUploadId },
      select: {
        id: true,
        community_platform_member_id: true,
        status: true,
        expires_at: true,
        deleted_at: true,
      },
    });
  // Ownership check
  if (tempUpload.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if deleted
  if (tempUpload.deleted_at !== null) {
    throw new HttpException("Temp upload not found", 404);
  }
  // Check if expired
  const now = new Date();
  if (tempUpload.expires_at < now) {
    throw new HttpException("Temp upload has expired", 410);
  }
  // Validate status transitions if status is being updated
  if (props.body.status !== undefined) {
    const currentStatus = tempUpload.status;
    const newStatus = props.body.status;
    // Allow setting to null to clear status
    if (newStatus !== null && newStatus !== currentStatus) {
      const validTransitions: Record<string, string[]> = {
        pending: ["processing", "expired"],
        processing: ["attached", "failed"],
        // "attached", "expired", "failed" are terminal states
      };
      const allowed = validTransitions[currentStatus] || [];
      if (!allowed.includes(newStatus)) {
        throw new HttpException(
          `Invalid status transition from ${currentStatus} to ${newStatus}`,
          400,
        );
      }
    }
  }
  // Validate expires_at if being updated
  if (props.body.expires_at !== undefined && props.body.expires_at !== null) {
    const newExpiresAt = new Date(props.body.expires_at);
    const maxExpiresAt = new Date();
    maxExpiresAt.setDate(maxExpiresAt.getDate() + 7); // 7 days from now
    if (newExpiresAt <= now) {
      throw new HttpException("expires_at must be in the future", 400);
    }
    if (newExpiresAt > maxExpiresAt) {
      throw new HttpException(
        "expires_at cannot be more than 7 days in the future",
        400,
      );
    }
  }
  // Prepare update data with proper Prisma types
  const updateData: Prisma.community_platform_temp_uploadsUpdateInput = {};
  // Handle status: undefined (skip), null (skip), string (set value)
  if (props.body.status !== undefined && props.body.status !== null) {
    updateData.status = props.body.status;
  }
  // Handle expires_at: undefined (skip), null (skip), string (set Date)
  if (props.body.expires_at !== undefined && props.body.expires_at !== null) {
    updateData.expires_at = new Date(props.body.expires_at);
  }
  updateData.updated_at = new Date();
  // Perform update
  await MyGlobal.prisma.community_platform_temp_uploads.update({
    where: { id: props.tempUploadId },
    data: updateData,
  });
  // Fetch updated record with transformer
  const updated =
    await MyGlobal.prisma.community_platform_temp_uploads.findUniqueOrThrow({
      where: { id: props.tempUploadId },
      ...CommunityPlatformTempUploadTransformer.select(),
    });
  return await CommunityPlatformTempUploadTransformer.transform(updated);
}
