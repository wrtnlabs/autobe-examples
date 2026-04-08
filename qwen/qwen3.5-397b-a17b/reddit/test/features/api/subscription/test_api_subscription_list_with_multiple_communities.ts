import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
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
 * Test member subscription list retrieval with multiple community subscriptions.
 *
 * Validates the complete subscription list workflow including member authentication, multiple community creation, subscription to those communities, and retrieval of the paginated subscription list. Ensures that all active subscriptions are returned with correct community details and proper ordering.
 *
 * The test creates a member account, establishes subscriptions to multiple communities, then retrieves the subscription list to verify correct data structure, pagination metadata, and ordering by creation timestamp.
 *
 * 1. Member registers and authenticates to obtain valid session.
 * 2. Creates multiple communities with unique names and descriptions.
 * 3. Subscribes to each created community to populate subscription list.
 * 4. Retrieves subscription list via PATCH endpoint with pagination.
 * 5. Validates response structure, pagination metadata, and subscription ordering.
 */
export async function test_api_subscription_list_with_multiple_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
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
  // 2. Create multiple communities for subscription testing
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
  // 3. Subscribe to all created communities
  await generate_random_reddit_community_member_member_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community1.id,
      } satisfies IRedditCommunitySubscription.ICreate,
    },
  );
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
  // 4. Retrieve subscription list
  const response =
    await api.functional.redditCommunity.member.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(response);
  // 5. Validate pagination metadata
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("limit", response.pagination.limit, 20);
  TestValidator.equals("total records", response.pagination.records, 3);
  TestValidator.equals("total pages", response.pagination.pages, 1);
  // 6. Validate subscription data
  TestValidator.equals("subscription count", response.data.length, 3);
  // Verify all subscriptions are for the created communities
  const subscriptionCommunityIds = response.data.map((s) => s.community.id);
  TestValidator.predicate(
    "contains community1",
    subscriptionCommunityIds.includes(community1.id),
  );
  TestValidator.predicate(
    "contains community2",
    subscriptionCommunityIds.includes(community2.id),
  );
  TestValidator.predicate(
    "contains community3",
    subscriptionCommunityIds.includes(community3.id),
  );
  // 7. Validate ordering (most recent first - descending by created_at)
  TestValidator.predicate("subscriptions ordered by created_at desc", () => {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].created_at).getTime();
      const next = new Date(response.data[i + 1].created_at).getTime();
      if (current < next) {
        return false;
      }
    }
    return true;
  });
  // 8. Validate subscriber counts are accurate (each community should have at least 1 subscriber)
  for (const subscription of response.data) {
    TestValidator.predicate(
      `community ${subscription.community.name} has positive subscribers`,
      subscription.community.subscribers_count >= 1,
    );
  }
}
