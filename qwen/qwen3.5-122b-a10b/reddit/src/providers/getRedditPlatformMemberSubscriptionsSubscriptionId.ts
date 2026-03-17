import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunitySubscriptionTransformer } from "../transformers/RedditPlatformCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformCommunitySubscription> {
  const subscription =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.findUniqueOrThrow(
      {
        where: {
          id: props.subscriptionId,
          deleted_at: null,
        },
        ...RedditPlatformCommunitySubscriptionTransformer.select(),
      },
    );
  if (subscription.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await RedditPlatformCommunitySubscriptionTransformer.transform(
    subscription,
  );
}
