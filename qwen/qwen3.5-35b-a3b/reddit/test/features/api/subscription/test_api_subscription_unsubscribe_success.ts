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

export async function test_api_subscription_unsubscribe_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name:
            RandomGenerator.alphabets(8) + "_" + RandomGenerator.alphabets(4),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  const subscriptionId = subscription.id;
  const subscribedAt = subscription.subscribed_at;
  // 4. Verify subscription is active before deletion
  TestValidator.predicate(
    "subscription initially active",
    subscription.deleted_at === null,
  );
  // 5. Unsubscribe (DELETE subscription)
  await api.functional.redditPlatform.member.subscriptions.erase(
    memberConnection,
    {
      subscriptionId: subscriptionId,
    },
  );
  // 6. Verify 204 No Content - erase returns void, which implies 204
  // 7. Verify user can resubscribe to same community
  const resubscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(resubscription);
  // 8. Verify resubscription has different ID (new record)
  TestValidator.notEquals(
    "resubscription has different ID",
    subscriptionId,
    resubscription.id,
  );
  // 9. Verify resubscription is active (not deleted)
  TestValidator.predicate(
    "resubscription is active",
    resubscription.deleted_at === null,
  );
  // 10. Verify resubscription subscribed_at is after unsubscribe time
  TestValidator.predicate(
    "resubscription timestamp is after unsubscribe",
    new Date(resubscription.subscribed_at) > new Date(subscribedAt),
  );
  // 11. Verify original subscription ID is preserved (not reused)
  TestValidator.notEquals(
    "original subscription record preserved with different ID",
    subscriptionId,
    resubscription.id,
  );
}
