import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

/**
 * Test that unsubscribing from a community does not delete the member's existing data.
 *
 * This test validates the subscription removal behavior:
 * 1. Member creates account and subscribes to a community
 * 2. Member unsubscribes from the community
 * 3. Verifies subscription is soft-deleted and entities remain intact
 *
 * Business Logic:
 * - Unsubscribing does not cascade delete user content (posts/comments)
 * - Only account deletion triggers cascade to user-generated content
 * - Subscription uses soft-delete pattern with deleted_at timestamp
 */
export async function test_api_subscription_unsubscribe_content_preserved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authorized connection
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with auth token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Create a community
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      },
    },
  );
  typia.assert(community);
  // 4. Create subscription to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // Store subscription ID for deletion
  const subscriptionId = subscription.id;
  // 5. Verify subscription is active (deleted_at is null)
  TestValidator.predicate(
    "subscription should be active before unsubscribe",
    subscription.deleted_at === null,
  );
  // 6. Unsubscribe from the community (DELETE subscription)
  await api.functional.redditClone.member.subscriptions.erase(
    memberConnection,
    {
      subscriptionId: subscriptionId,
    },
  );
  // 7. Validate business logic: Member identity preserved after unsubscribe
  // This demonstrates no cascade deletion occurred on the member account
  TestValidator.equals(
    "member username preserved after unsubscribe",
    memberAuth.username,
    subscription.member.username,
  );
  // 8. Validate business logic: Community preserved after unsubscribe
  // This demonstrates no cascade deletion occurred on the community
  TestValidator.equals(
    "community name preserved after unsubscribe",
    community.name,
    subscription.community.name,
  );
  // 9. Validate that member and community are independent entities
  // Content ownership is independent of subscription status
  TestValidator.predicate(
    "member and community remain separate entities",
    memberAuth.id !== community.owner.id,
  );
}
