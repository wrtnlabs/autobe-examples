import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityBanTransformer } from "../transformers/CommunityPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminCommunitiesCommunityIdBansBanId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBan.IUpdate;
}): Promise<ICommunityPlatformCommunityBan> {
  // Find existing ban record
  const existingBan =
    await MyGlobal.prisma.community_platform_community_bans.findUniqueOrThrow({
      where: {
        id: props.banId,
        community_id: props.communityId,
      },
    });
  // Validate status transitions
  if (props.body.status !== undefined) {
    const validTransitions: Record<string, string[]> = {
      active: ["expired", "revoked"],
      expired: [], // Cannot reactivate expired bans
      revoked: [], // Cannot reactivate revoked bans
    };
    const currentStatus = existingBan.status;
    const newStatus = props.body.status;
    if (
      validTransitions[currentStatus] &&
      !validTransitions[currentStatus].includes(newStatus)
    ) {
      throw new HttpException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        400,
      );
    }
  }
  // Validate expiration date (must be in future if provided)
  if (props.body.expires_at !== undefined && props.body.expires_at !== null) {
    const expiresAt = new Date(props.body.expires_at);
    const now = new Date();
    if (expiresAt <= now) {
      throw new HttpException("Expiration date must be in the future", 400);
    }
  }
  // Build update data with partial updates
  const updateData: Prisma.community_platform_community_bansUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.reason !== undefined) updateData.reason = props.body.reason;
  if (props.body.status !== undefined) updateData.status = props.body.status;
  if (props.body.expires_at !== undefined) {
    updateData.expires_at = props.body.expires_at
      ? new Date(props.body.expires_at)
      : null;
  }
  if (props.body.revoked_at !== undefined) {
    updateData.revoked_at = props.body.revoked_at
      ? new Date(props.body.revoked_at)
      : null;
  }
  if (props.body.revoke_reason !== undefined)
    updateData.revoke_reason = props.body.revoke_reason;
  // Update the ban record
  await MyGlobal.prisma.community_platform_community_bans.update({
    where: { id: props.banId },
    data: updateData,
  });
  // Retrieve the updated ban with relations
  const updatedBan =
    await MyGlobal.prisma.community_platform_community_bans.findUniqueOrThrow({
      where: { id: props.banId },
      ...CommunityPlatformCommunityBanTransformer.select(),
    });
  return await CommunityPlatformCommunityBanTransformer.transform(updatedBan);
}
