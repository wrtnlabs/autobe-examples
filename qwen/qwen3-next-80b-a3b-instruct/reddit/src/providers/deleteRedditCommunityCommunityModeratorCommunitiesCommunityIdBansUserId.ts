import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCommunityCommunityModeratorCommunitiesCommunityIdBansUserId(props: {
  communityModerator: CommunitymoderatorPayload;
  communityId: string & tags.Format<"uuid">;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify user is authorized as owner or moderator of the community
  const isAuthorized =
    (await MyGlobal.prisma.reddit_community_community_owners.findFirst({
      where: {
        community_id: props.communityId,
        id: props.communityModerator.id,
      },
    })) ||
    (await MyGlobal.prisma.reddit_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.communityModerator.id,
      },
    }));
  if (!isAuthorized) {
    throw new HttpException("Forbidden", 403);
  }
  // Find active ban record
  const ban = await MyGlobal.prisma.reddit_community_bans.findFirst({
    where: {
      community_id: props.communityId,
      user_id: props.userId,
      is_active: true,
    },
  });
  if (!ban) {
    throw new HttpException("Ban not found", 404);
  }
  // Soft-delete by deactivating
  await MyGlobal.prisma.reddit_community_bans.update({
    where: { id: ban.id },
    data: {
      is_active: false,
      updated_at: new Date().toISOString(),
    },
  });
}
