import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_subscriptions_create } from "../../../generate/generate_random_reddit_platform_member_subscriptions_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_subscription } from "../../../prepare/prepare_random_reddit_platform_subscription";

export async function test_api_subscription_unsubscribe_flow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate new member
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create community using member's authenticated connection
  const communityConnection: api.IConnection = { host: connection.host };
  const communityName =
    RandomGenerator.alphaNumeric(10) + "_" + RandomGenerator.alphaNumeric(4);
  const community =
    await api.functional.redditPlatform.member.communities.create(
      communityConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to the community
  const subscription =
    await api.functional.redditPlatform.member.subscriptions.create(
      communityConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  const initialSubscriberCount = subscription.community.subscriber_count;
  // 4. Unsubscribe from the community
  const unsubscribeConnection: api.IConnection = { host: connection.host };
  await api.functional.redditPlatform.member.communities._subscribe.erase(
    unsubscribeConnection,
    {
      name: community.name,
    },
  );
  // 5. Verify subscriber count decreased by exactly 1 by resubscribing
  const resubscription =
    await api.functional.redditPlatform.member.subscriptions.create(
      communityConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditPlatformSubscription.ICreate,
      },
    );
  typia.assert(resubscription);
  // 6. Verify resubscription creates valid record and count increased back
  TestValidator.equals(
    "resubscription community_id",
    resubscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "subscriber count increased back",
    resubscription.community.subscriber_count,
    initialSubscriberCount,
  );
}
