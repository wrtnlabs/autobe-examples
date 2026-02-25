import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCommunityCommunityOwnerCommunitiesCommunityIdModeratorsUserId(props: {
  communityOwner: CommunityownerPayload;
  communityId: string;
  userId: string;
}): Promise<void> {
  // Validate that the community exists and is owned by the authenticated owner
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { owner_user_id: true },
    });
  if (community.owner_user_id !== props.communityOwner.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate that the target user is not the community owner themselves
  if (community.owner_user_id === props.userId) {
    throw new HttpException("Cannot remove owner as moderator", 403);
  }
  // Delete moderator record if it exists; otherwise throws 404
  await MyGlobal.prisma.reddit_community_moderators.delete({
    where: {
      user_id_community_id: {
        user_id: props.userId,
        community_id: props.communityId,
      },
    },
  });
}
