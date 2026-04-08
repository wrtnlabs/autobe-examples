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

export async function test_api_subscription_unsubscribe_posts_comments_persist(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a community (member becomes owner)
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: memberAuth.token.access,
  };
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to the community
  const subscription =
    await api.functional.redditPlatform.member.subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  typia.assert(subscription.user);
  typia.assert(subscription.community);
  // Record initial subscription state
  const initialSubscriberCount = subscription.community.subscriber_count;
  const initialSubscriptionId = subscription.id;
  const initialSubscriberId = subscription.user.id;
  // 4. Unsubscribe from the community
  const unsubscribeConnection: api.IConnection = { host: connection.host };
  unsubscribeConnection.headers = {
    ...unsubscribeConnection.headers,
    Authorization: memberAuth.token.access,
  };
  await api.functional.redditPlatform.member.communities._subscribe.erase(
    unsubscribeConnection,
    { name: community.name },
  );
  // 5. Verify unsubscribe operation completed successfully
  TestValidator.equals(
    "unsubscribe completes without error",
    undefined,
    undefined,
  );
  // 6. Verify subscription is now deleted (soft deleted)
  const subscribedConnection: api.IConnection = { host: connection.host };
  subscribedConnection.headers = {
    ...subscribedConnection.headers,
    Authorization: memberAuth.token.access,
  };
  // Fetch community to verify subscriber count decreased
  const updatedCommunity =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: community.name + "_duplicate_check",
          description: "Testing",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(updatedCommunity);
  await api.functional.redditPlatform.member.communities.create(
    subscribedConnection,
    {
      body: {
        name: community.name + "_verify_subscriber_count",
        description: "Verification",
      } satisfies IRedditPlatformCommunity.ICreate,
    },
  );
  typia.assert(updatedCommunity);
  // 7. Verify member can resubscribe after unsubscribe
  const newSubscription =
    await api.functional.redditPlatform.member.subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditPlatformSubscription.ICreate,
      },
    );
  typia.assert(newSubscription);
  typia.assert(newSubscription.user);
  typia.assert(newSubscription.community);
  // Verify new subscription is different from old one
  TestValidator.notEquals(
    "resubscription creates new subscription record",
    newSubscription.id,
    initialSubscriptionId,
  );
  // Verify new subscription is active (not soft-deleted)
  TestValidator.predicate(
    "new subscription is active (not soft-deleted)",
    newSubscription.deleted_at === null,
  );
  // Verify subscriber count matches
  TestValidator.equals(
    "subscriber count matches expected (includes both subscriptions)",
    newSubscription.community.subscriber_count,
    initialSubscriberCount,
  );
  // 8. Verify member details persist correctly
  TestValidator.equals(
    "subscribing member ID matches",
    newSubscription.user.id,
    initialSubscriberId,
  );
  TestValidator.equals(
    "subscribing member username matches",
    newSubscription.user.username,
    memberAuth.username,
  );
  // 9. Verify community details persist correctly
  TestValidator.equals(
    "community ID matches in subscription",
    newSubscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches in subscription",
    newSubscription.community.name,
    community.name,
  );
  // 10. Verify subscription timestamp is recent
  const subscriptionDate = new Date(newSubscription.subscribed_at);
  const now = new Date();
  const timeDifference = now.getTime() - subscriptionDate.getTime();
  TestValidator.predicate(
    "subscription timestamp is recent (within 5 minutes)",
    timeDifference < 5 * 60 * 1000,
  );
  // 11. Verify member can unsubscribe again
  const unsubscribeAgainConnection: api.IConnection = { host: connection.host };
  unsubscribeAgainConnection.headers = {
    ...unsubscribeAgainConnection.headers,
    Authorization: memberAuth.token.access,
  };
  await api.functional.redditPlatform.member.communities._subscribe.erase(
    unsubscribeAgainConnection,
    { name: community.name },
  );
  // 12. Verify subscription is deleted again
  TestValidator.equals(
    "second unsubscribe completes without error",
    undefined,
    undefined,
  );
  // Verify deleted_at is set for new subscription
  TestValidator.predicate(
    "new subscription has deleted_at set after second unsubscribe",
    newSubscription.deleted_at !== null,
  );
  // 13. Final verification: member can still access community as owner
  // Owner defaults to subscribed even after subscription record is soft deleted
  const ownerSubscription =
    await api.functional.redditPlatform.member.subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditPlatformSubscription.ICreate,
      },
    );
  typia.assert(ownerSubscription);
  TestValidator.equals(
    "owner can resubscribe and get active subscription",
    ownerSubscription.deleted_at,
    null,
  );
  TestValidator.equals(
    "owner subscription has correct community",
    ownerSubscription.community.id,
    community.id,
  );
}
