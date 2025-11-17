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

export async function postCommunityForumUserCommunitiesCommunitySlugSubscriptions(props: {
  user: UserPayload;
  communitySlug: string;
}): Promise<ICommunityForumCommunitySubscription> {
  // Find the community by slug
  const community =
    await MyGlobal.prisma.community_forum_communities.findUnique({
      where: {
        slug: props.communitySlug,
        deleted_at: null,
      },
    });

  // Verify community exists
  if (!community) {
    throw new HttpException("Community not found or has been deleted", 404);
  }

  // Verify community is active
  if (community.status !== "active") {
    throw new HttpException("Cannot subscribe to an inactive community", 400);
  }

  // Check if user is already subscribed
  const existingSubscription =
    await MyGlobal.prisma.community_forum_subscriptions.findUnique({
      where: {
        community_forum_user_id_community_forum_community_id: {
          community_forum_user_id: props.user.id,
          community_forum_community_id: community.id,
        },
      },
    });

  if (existingSubscription) {
    throw new HttpException(
      "User is already subscribed to this community",
      409,
    );
  }

  // Create the subscription and increment member count in a transaction
  const [subscription] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_forum_subscriptions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_forum_user_id: props.user.id,
        community_forum_community_id: community.id,
        created_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
    }),
    MyGlobal.prisma.community_forum_communities.update({
      where: { id: community.id },
      data: { member_count: { increment: 1 } },
    }),
  ]);

  // Return the subscription object
  return {
    id: subscription.id,
    communityForumUserId: subscription.community_forum_user_id,
    communityForumCommunityId: subscription.community_forum_community_id,
    createdAt: toISOStringSafe(subscription.created_at),
  };
}
