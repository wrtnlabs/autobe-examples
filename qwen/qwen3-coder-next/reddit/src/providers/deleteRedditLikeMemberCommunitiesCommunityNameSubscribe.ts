import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteRedditLikeMemberCommunitiesCommunityNameSubscribe(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<void> {
  // Find the community by name
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: { name: props.communityName, deleted_at: null },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Find the subscription record
  const subscription =
    await MyGlobal.prisma.reddit_like_subscriptions.findFirst({
      where: {
        reddit_like_member_id: props.member.id,
        reddit_like_community_id: community.id,
        deleted_at: null,
      },
    });
  if (subscription === null) {
    throw new HttpException("Subscription not found", 404);
  }
  // Update the subscription status to 'unsubscribed'
  await MyGlobal.prisma.reddit_like_subscriptions.update({
    where: { id: subscription.id },
    data: {
      status: "unsubscribed",
      updated_at: new Date().toISOString(),
    },
  });
  // Decrement the community's subscriber count
  await MyGlobal.prisma.reddit_like_communities.update({
    where: { id: community.id },
    data: {
      subscriberCount: { decrement: 1 },
    },
  });
}
