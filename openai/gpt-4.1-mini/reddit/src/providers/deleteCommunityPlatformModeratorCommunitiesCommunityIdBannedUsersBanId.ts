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

export async function deleteCommunityPlatformModeratorCommunitiesCommunityIdBannedUsersBanId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if the moderator is part of the community moderators for the specified community
  const communityModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        moderator_platform_member_id: props.moderator.id,
        deleted_at: null,
      },
    });
  // Check if the moderator is owner of the community
  const communityOwner =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: props.communityId,
        owner_platform_member_id: props.moderator.id,
        deleted_at: null,
      },
    });
  if (!communityModerator && !communityOwner) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify the ban record exists for the given banId and communityId
  await MyGlobal.prisma.community_platform_community_bans.findFirstOrThrow({
    where: {
      id: props.banId,
      community_id: props.communityId,
    },
  });
  // Delete the ban record
  await MyGlobal.prisma.community_platform_community_bans.delete({
    where: { id: props.banId },
  });
  // Log the ban removal action
  await MyGlobal.prisma.community_platform_moderation_logs.create({
    data: {
      id: v4(),
      community_platform_community_id: props.communityId,
      moderator_platform_member_id: props.moderator.id,
      action: "unban_user",
      target_ban_id: props.banId,
      created_at: new Date().toISOString(),
    },
  });
}
