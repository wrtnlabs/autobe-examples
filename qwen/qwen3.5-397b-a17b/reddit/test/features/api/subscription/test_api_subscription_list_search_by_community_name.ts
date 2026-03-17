import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneSubscription";
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
 * Test the search/filter functionality when retrieving subscribed communities by community name.
 * The member joins, creates or subscribes to multiple communities with different names.
 * When calling the subscriptions list endpoint with community_name filter parameter, verify that:
 * (1) only subscriptions matching the search term are returned (partial/case-insensitive matching),
 * (2) non-matching subscriptions are excluded from results,
 * (3) pagination reflects filtered result count,
 * (4) community details are still included for matched subscriptions.
 * This validates the search capability for members to find specific communities in their subscription list.
 */
export async function test_api_subscription_list_search_by_community_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
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
  // 2. Create multiple communities with distinct names for search testing
  // When a member creates a community, they are automatically subscribed to it
  const communityTech = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: "technology-news",
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(communityTech);
  const communityGaming = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: "gaming-community",
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(communityGaming);
  const communityTechReviews =
    await generate_random_reddit_clone_communities_create(memberConnection, {
      body: {
        name: "tech-reviews-hub",
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCloneCommunity.ICreate,
    });
  typia.assert(communityTechReviews);
  const communityFood = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: "foodie-paradise",
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(communityFood);
  // 3. Test search functionality with "tech" keyword
  // This should match "technology-news" and "tech-reviews-hub" (2 results)
  const searchResultTech =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          community_name: "tech",
          page: 1,
          limit: 10,
        } satisfies IRedditCloneSubscription.IRequest,
      },
    );
  typia.assert(searchResultTech);
  // Validate search results for "tech"
  TestValidator.equals(
    "tech search result count",
    searchResultTech.data.length,
    2,
  );
  TestValidator.equals(
    "tech pagination records",
    searchResultTech.pagination.records,
    2,
  );
  TestValidator.equals(
    "tech pagination pages",
    searchResultTech.pagination.pages,
    1,
  );
  // Verify all returned subscriptions contain "tech" in community name (case-insensitive)
  for (const subscription of searchResultTech.data) {
    const communityName = subscription.community.name.toLowerCase();
    TestValidator.predicate(
      "community name contains tech",
      communityName.includes("tech"),
    );
    // Verify community details are present
    TestValidator.predicate(
      "community id exists",
      subscription.community.id !== undefined,
    );
    TestValidator.predicate(
      "community name exists",
      subscription.community.name !== undefined,
    );
    TestValidator.predicate(
      "community description exists",
      subscription.community.description !== undefined,
    );
  }
  // 4. Test search with "gaming" keyword (should match 1 result)
  const searchResultGaming =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          community_name: "gaming",
          page: 1,
          limit: 10,
        } satisfies IRedditCloneSubscription.IRequest,
      },
    );
  typia.assert(searchResultGaming);
  TestValidator.equals(
    "gaming search result count",
    searchResultGaming.data.length,
    1,
  );
  TestValidator.equals(
    "gaming pagination records",
    searchResultGaming.pagination.records,
    1,
  );
  TestValidator.predicate(
    "gaming community name matches",
    searchResultGaming.data[0].community.name.toLowerCase().includes("gaming"),
  );
  // 5. Test search with "food" keyword (should match 1 result)
  const searchResultFood =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          community_name: "food",
          page: 1,
          limit: 10,
        } satisfies IRedditCloneSubscription.IRequest,
      },
    );
  typia.assert(searchResultFood);
  TestValidator.equals(
    "food search result count",
    searchResultFood.data.length,
    1,
  );
  TestValidator.equals(
    "food pagination records",
    searchResultFood.pagination.records,
    1,
  );
  TestValidator.predicate(
    "food community name matches",
    searchResultFood.data[0].community.name.toLowerCase().includes("food"),
  );
  // 6. Test search with no matching results
  const searchResultNoMatch =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          community_name: "xyz-nonexistent",
          page: 1,
          limit: 10,
        } satisfies IRedditCloneSubscription.IRequest,
      },
    );
  typia.assert(searchResultNoMatch);
  TestValidator.equals(
    "no match result count",
    searchResultNoMatch.data.length,
    0,
  );
  TestValidator.equals(
    "no match pagination records",
    searchResultNoMatch.pagination.records,
    0,
  );
  TestValidator.equals(
    "no match pagination pages",
    searchResultNoMatch.pagination.pages,
    0,
  );
  // 7. Test without filter (should return all 4 subscriptions)
  const searchResultAll =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCloneSubscription.IRequest,
      },
    );
  typia.assert(searchResultAll);
  TestValidator.equals(
    "all subscriptions count",
    searchResultAll.data.length,
    4,
  );
  TestValidator.equals(
    "all pagination records",
    searchResultAll.pagination.records,
    4,
  );
}
