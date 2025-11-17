import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunitySubscription";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityForumUserCommunitiesCommunitySlugSubscriptions(props: {
  user: UserPayload;
  communitySlug: string;
}): Promise<ICommunityForumCommunitySubscription> {
  // Find the community by slug
  const community =
    await MyGlobal.prisma.community_forum_communities.findUnique({
      where: {
        slug: props.communitySlug,
      },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Check if community is deleted
  if (community.deleted_at) {
    throw new HttpException("Community not found", 404);
  }

  // Find the existing subscription
  const subscription =
    await MyGlobal.prisma.community_forum_subscriptions.findFirst({
      where: {
        community_forum_user_id: props.user.id,
        community_forum_community_id: community.id,
      },
    });

  if (!subscription) {
    throw new HttpException("User is not subscribed to this community", 404);
  }

  // Delete the subscription and decrement community member count in transaction
  const [deleted] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_forum_subscriptions.delete({
      where: {
        id: subscription.id,
      },
    }),
    MyGlobal.prisma.community_forum_communities.update({
      where: {
        id: community.id,
      },
      data: {
        member_count: {
          decrement: 1,
        },
      },
    }),
  ]);

  // Return the deleted subscription data
  return {
    id: deleted.id,
    communityForumUserId: deleted.community_forum_user_id,
    communityForumCommunityId: deleted.community_forum_community_id,
    createdAt: toISOStringSafe(deleted.created_at),
  };
}
