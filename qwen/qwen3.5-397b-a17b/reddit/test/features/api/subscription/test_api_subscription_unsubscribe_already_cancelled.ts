import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test unsubscribe operation on already cancelled subscription.
 *
 * Validates the business rule that prevents duplicate unsubscribe operations on the same subscription. The test ensures that attempting to unsubscribe from a subscription that has already been cancelled results in an error response rather than silently succeeding or causing data inconsistency.
 *
 * Test flow:
 * 1. Register a new member account with randomized credentials.
 * 2. Create a community that the member will subscribe to.
 * 3. Create a subscription linking the member to the community.
 * 4. Successfully unsubscribe from the community (first call).
 * 5. Attempt to unsubscribe again with the same subscription ID (should fail).
 * 6. Validate that the second unsubscribe attempt throws an error.
 *
 * This edge case test ensures data integrity and prevents race conditions or duplicate operations that could corrupt subscription state or subscriber counts.
 */
export async function test_api_subscription_unsubscribe_already_cancelled(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to the community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. First unsubscribe - should succeed
  await api.functional.redditCommunity.member.member.subscriptions.erase(
    memberConnection,
    {
      subscriptionId: subscription.id,
    },
  );
  // 5. Second unsubscribe attempt - should fail with error
  await TestValidator.error("already cancelled subscription", async () => {
    await api.functional.redditCommunity.member.member.subscriptions.erase(
      memberConnection,
      {
        subscriptionId: subscription.id,
      },
    );
  });
}
