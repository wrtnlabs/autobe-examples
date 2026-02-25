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

export async function deleteRedditCommunityCommunityModeratorCommunitiesCommunityIdModeratorsUserId(props: {
  communityModerator: CommunitymoderatorPayload;
  communityId: string;
  userId: string;
}): Promise<void> {
  // 1. Find the community and verify owner matches authenticated user
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { owner_user_id: true },
    });
  if (community.owner_user_id !== props.communityModerator.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Find moderator relationship using exact composite key from schema
  const moderatorRecord =
    await MyGlobal.prisma.reddit_community_moderators.findUniqueOrThrow({
      where: {
        user_id_community_id: {
          user_id: props.userId,
          community_id: props.communityId,
        },
      },
    });
  // 3. Validate that the user being removed is not the community owner
  // Note: Community owner is not stored in reddit_community_moderators, but defensive check
  if (moderatorRecord.user_id === community.owner_user_id) {
    throw new HttpException("Cannot remove community owner as moderator", 403);
  }
  // 4. Delete the moderator relationship
  await MyGlobal.prisma.reddit_community_moderators.delete({
    where: {
      user_id_community_id: {
        user_id: props.userId,
        community_id: props.communityId,
      },
    },
  });
  // Success - no response body
}
