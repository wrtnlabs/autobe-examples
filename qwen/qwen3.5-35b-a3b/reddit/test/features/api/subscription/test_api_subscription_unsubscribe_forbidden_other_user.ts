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
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_subscription_unsubscribe_forbidden_other_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (subscription owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create community for subscription testing
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(6),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Member A subscribes to community (creates subscription record with ID)
  const subscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberAConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  const originalSubscriptionId = subscription.id;
  typia.assert(subscription.deleted_at === null);
  // 4. Create member B (unauthorized user who will attempt forbidden deletion)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 5. Member B attempts to delete subscription owned by member A (should fail with 403)
  await TestValidator.error(
    "member cannot delete another user's subscription",
    async () => {
      await api.functional.redditPlatform.member.subscriptions.erase(
        memberBConnection,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );
  // 6. Verify subscription is still intact by having member A erase their own subscription
  // If member B's attempt succeeded, this would fail with "not found"
  await api.functional.redditPlatform.member.subscriptions.erase(
    memberAConnection,
    {
      subscriptionId: originalSubscriptionId,
    },
  );
  // 7. Verify member A can re-subscribe to the same community
  const newSubscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberAConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(newSubscription);
  TestValidator.equals(
    "new subscription has different ID",
    newSubscription.id,
    originalSubscriptionId,
  );
  typia.assert(newSubscription.deleted_at === null);
}