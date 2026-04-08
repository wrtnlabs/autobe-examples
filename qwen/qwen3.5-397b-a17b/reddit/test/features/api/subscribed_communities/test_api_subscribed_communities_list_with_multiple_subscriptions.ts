import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
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
 * Test subscribed communities list retrieval with multiple subscriptions and timestamp-based ordering.
 *
 * Validates the complete subscription workflow including member authentication, community creation, sequential subscriptions, and retrieval of subscribed communities with correct ordering. Ensures that the subscribed communities endpoint returns all subscribed communities ordered by subscription timestamp with the most recently subscribed community appearing first.
 *
 * The test creates three distinct communities and subscribes to them sequentially with small delays between each subscription to ensure different timestamps. This allows verification that the ordering is based on subscription time rather than community creation date or alphabetical order.
 *
 * 1. Member registers new account and obtains authentication token.
 * 2. Creates three communities with unique names and descriptions.
 * 3. Subscribes to each community sequentially with delays to create distinct timestamps.
 * 4. Calls subscribed-communities endpoint to retrieve the list.
 * 5. Validates response contains all three subscribed communities.
 * 6. Validates ordering matches subscription sequence (last subscribed appears first).
 * 7. Validates each community record includes all required fields.
 * 8. Validates pagination metadata is accurate (current page, total records, total pages).
 */
export async function test_api_subscribed_communities_list_with_multiple_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create three distinct communities
  const community1 =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community1);
  const community2 =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community2);
  const community3 =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community3);
  // 3. Subscribe to each community sequentially with delays for distinct timestamps
  const subscription1 =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community1.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription1);
  // Small delay to ensure different subscription timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  const subscription2 =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community2.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription2);
  // Small delay to ensure different subscription timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  const subscription3 =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community3.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription3);
  // 4. Retrieve subscribed communities list
  const response =
    await api.functional.redditCommunity.member.subscribed_communities.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunity.IRequest,
      },
    );
  typia.assert(response);
  // 5. Verify all subscribed communities are present
  TestValidator.equals("total subscribed communities", response.data.length, 3);
  const communityIds = response.data.map((c) => c.id);
  TestValidator.predicate(
    "contains community1",
    communityIds.includes(community1.id),
  );
  TestValidator.predicate(
    "contains community2",
    communityIds.includes(community2.id),
  );
  TestValidator.predicate(
    "contains community3",
    communityIds.includes(community3.id),
  );
  // 6. Verify ordering by subscription timestamp (most recent first)
  // subscription3 was created last, so community3 should appear first
  TestValidator.equals(
    "first community is most recent subscription",
    response.data[0].id,
    community3.id,
  );
  TestValidator.equals(
    "second community is middle subscription",
    response.data[1].id,
    community2.id,
  );
  TestValidator.equals(
    "third community is earliest subscription",
    response.data[2].id,
    community1.id,
  );
  // 7. Verify required fields exist on each community
  for (const community of response.data) {
    TestValidator.predicate("community has id", community.id !== undefined);
    TestValidator.predicate("community has name", community.name !== undefined);
    TestValidator.predicate(
      "community has description",
      community.description !== undefined,
    );
    TestValidator.predicate("community has icon", community.icon !== undefined);
    TestValidator.predicate(
      "community has owner",
      community.owner !== undefined,
    );
    TestValidator.predicate(
      "community has subscribers_count",
      community.subscribers_count !== undefined,
    );
    TestValidator.predicate(
      "community has created_at",
      community.created_at !== undefined,
    );
  }
  // 8. Verify pagination metadata
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("total records", response.pagination.records, 3);
  TestValidator.equals("total pages", response.pagination.pages, 1);
  TestValidator.predicate("limit is valid", response.pagination.limit >= 3);
}