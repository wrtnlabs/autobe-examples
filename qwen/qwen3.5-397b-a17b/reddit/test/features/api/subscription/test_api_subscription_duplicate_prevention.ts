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
 * Test the business rule that prevents duplicate subscriptions to the same community.
 *
 * This test validates that the subscription system enforces a unique constraint preventing members from subscribing to the same community multiple times.
 *
 * The test workflow: 1) Authenticate as a new member via join endpoint, 2) Create a new community using the authenticated member connection, 3) Subscribe to the created community (first subscription should succeed and return subscription entity), 4) Attempt to subscribe to the same community again (should fail with 409 Conflict error indicating duplicate subscription).
 *
 * Key validation points: First subscription returns valid IRedditCommunitySubscription entity with member and community references, second subscription attempt throws HTTP error (409 Conflict) without creating duplicate record, the subscription entity contains correct community_id matching the created community, and the member reference in the subscription matches the authenticated member.
 *
 * 1. Authenticate as new member via join endpoint.
 * 2. Create a new community using the authenticated member connection.
 * 3. Subscribe to the created community (first subscription succeeds).
 * 4. Attempt to subscribe to the same community again (should fail with 409 Conflict).
 * 5. Validate first subscription entity structure and community_id match.
 */
export async function test_api_subscription_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a new community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. First subscription - should succeed
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
  // 4. Validate first subscription
  TestValidator.equals(
    "community_id matches",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals("member_id matches", subscription.member.id, member.id);
  TestValidator.predicate(
    "subscription is active",
    subscription.deletedAt === null,
  );
  // 5. Second subscription to same community - should fail with 409 Conflict
  await TestValidator.error("duplicate subscription prevented", async () => {
    await api.functional.redditCommunity.member.member.subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  });
}
