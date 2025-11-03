import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postRedditCommunityUserCommunitiesCommunityNameSubscriptions(props: {
  user: UserPayload;
  communityName: string;
  body: IRedditCommunitySubscription.ICreate;
}): Promise<IRedditCommunitySubscription> {
  const { user, communityName } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
      select: { id: true },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const existingSubscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findFirst({
      where: {
        reddit_community_user_id: user.id,
        reddit_community_community_id: community.id,
      },
    });

  if (existingSubscription) {
    throw new HttpException("Subscription already exists", 409);
  }

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.reddit_community_subscriptions.create({
    data: {
      id,
      reddit_community_user_id: user.id,
      reddit_community_community_id: community.id,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    reddit_community_user_id: created.reddit_community_user_id,
    reddit_community_community_id: created.reddit_community_community_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
