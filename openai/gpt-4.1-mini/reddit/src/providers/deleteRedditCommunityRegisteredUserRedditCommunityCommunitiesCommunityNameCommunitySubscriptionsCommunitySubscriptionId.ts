import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function deleteRedditCommunityRegisteredUserRedditCommunityCommunitiesCommunityNameCommunitySubscriptionsCommunitySubscriptionId(props: {
  registeredUser: RegistereduserPayload;
  communityName: string;
  communitySubscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.communityName },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const subscription =
    await MyGlobal.prisma.reddit_community_community_subscriptions.findUnique({
      where: { id: props.communitySubscriptionId },
    });
  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }

  if (subscription.registereduser_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }

  if (subscription.community_id !== community.id) {
    throw new HttpException(
      "Subscription does not belong to the specified community",
      400,
    );
  }

  await MyGlobal.prisma.reddit_community_community_subscriptions.delete({
    where: { id: props.communitySubscriptionId },
  });
}
