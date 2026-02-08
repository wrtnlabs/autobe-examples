import { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorCommunitiesCommunityIdBannedUsersBan(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBannedUser.IBan;
}): Promise<ICommunityPlatformCommunityBannedUser> {
  // Verify moderator is owner or moderator of community
  const communityMod =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        community_moderator_id: props.moderator.id,
        deleted_at: null,
      },
    });
  if (!communityMod) {
    throw new HttpException(
      "Forbidden: You are not authorized as community owner or moderator",
      403,
    );
  }
  // Extract banned user ID and reason from body - using userId and banReason as IBan has no fields
  const userId = (props.body as any).userId as string & tags.Format<"uuid">;
  const banReason = (props.body as any).banReason as string;
  // Check if already banned
  const existingBan =
    await MyGlobal.prisma.community_platform_community_banned_users.findFirst({
      where: {
        community_id: props.communityId,
        user_id: userId,
        unbanned_at: null,
      },
    });
  if (existingBan) {
    throw new HttpException("User is already banned in this community", 400);
  }
  const now = toISOStringSafe(new Date());
  // Create ban record
  const createdBan =
    await MyGlobal.prisma.community_platform_community_banned_users.create({
      data: {
        id: v4(),
        community: { connect: { id: props.communityId } },
        user: { connect: { id: userId } },
        banned_at: now,
        unbanned_at: null,
        ban_reason: banReason,
        created_at: now,
        updated_at: now,
      },
    });
  // Log moderation action
  await MyGlobal.prisma.community_platform_moderation_logs.create({
    data: {
      id: v4(),
      moderator_id: props.moderator.id,
      action_type: "ban_user",
      created_at: now,
      updated_at: now,
    },
  });
  // Return the created ban record
  return {
    id: createdBan.id,
    community_id: createdBan.community_id,
    user_id: createdBan.user_id,
    banned_at: createdBan.banned_at,
    unbanned_at: createdBan.unbanned_at,
    ban_reason: createdBan.ban_reason,
  };
}
