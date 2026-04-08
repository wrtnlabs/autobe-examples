import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommunitySubscriptionTransformer } from "../transformers/RedditCloneCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneCommunitiesCommunityIdSubscriptionsSubscriptionId(props: {
  communityId: string & tags.Format<"uuid">;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneCommunitySubscription> {
  const record =
    await MyGlobal.prisma.reddit_clone_community_subscriptions.findFirstOrThrow(
      {
        ...RedditCloneCommunitySubscriptionTransformer.select(),
        where: {
          id: props.subscriptionId,
          reddit_clone_community_id: props.communityId,
          deleted_at: null,
        },
      },
    );
  return await RedditCloneCommunitySubscriptionTransformer.transform(record);
}
