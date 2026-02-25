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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityBanTransformer } from "../transformers/CommunityPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putCommunityPlatformModeratorCommunitiesCommunityIdBansBanId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBan.IUpdate;
}): Promise<ICommunityPlatformCommunityBan> {
  // Verify moderator has permission for this community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.moderator.id,
        deleted_at: null,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "You do not have moderator permissions for this community",
      403,
    );
  }
  // Find the existing ban record
  const existingBan =
    await MyGlobal.prisma.community_platform_community_bans.findUnique({
      where: { id: props.banId },
      select: { id: true, community_id: true, status: true, expires_at: true },
    });
  if (!existingBan) {
    throw new HttpException("Ban record not found", 404);
  }
  if (existingBan.community_id !== props.communityId) {
    throw new HttpException(
      "Ban record does not belong to the specified community",
      400,
    );
  }
  // Validate update fields
  const now = new Date().toISOString();
  if (props.body.expires_at !== undefined && props.body.expires_at !== null) {
    if (props.body.expires_at <= now) {
      throw new HttpException("Expiration date must be in the future", 400);
    }
  }
  // Validate status transitions
  if (props.body.status !== undefined) {
    const validTransitions: Record<string, string[]> = {
      active: ["expired", "revoked"],
      expired: [], // Cannot reactivate expired bans
      revoked: [], // Cannot reactivate revoked bans
    };
    const currentStatus = existingBan.status;
    const validTargets = validTransitions[currentStatus] || [];
    if (validTargets.length > 0 && !validTargets.includes(props.body.status)) {
      throw new HttpException(
        `Invalid status transition from ${currentStatus} to ${props.body.status}`,
        400,
      );
    }
  }
  // Prepare update data
  const updateData: Prisma.community_platform_community_bansUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.reason !== undefined) updateData.reason = props.body.reason;
  if (props.body.status !== undefined) updateData.status = props.body.status;
  if (props.body.expires_at !== undefined)
    updateData.expires_at =
      props.body.expires_at !== null ? new Date(props.body.expires_at) : null;
  if (props.body.revoked_at !== undefined)
    updateData.revoked_at = props.body.revoked_at
      ? new Date(props.body.revoked_at)
      : null;
  if (props.body.revoke_reason !== undefined)
    updateData.revoke_reason = props.body.revoke_reason;
  // Update the ban record
  await MyGlobal.prisma.community_platform_community_bans.update({
    where: { id: props.banId },
    data: updateData,
  });
  // Retrieve the updated ban with full details
  const updatedBan =
    await MyGlobal.prisma.community_platform_community_bans.findUniqueOrThrow({
      where: { id: props.banId },
      ...CommunityPlatformCommunityBanTransformer.select(),
    });
  return await CommunityPlatformCommunityBanTransformer.transform(updatedBan);
}
