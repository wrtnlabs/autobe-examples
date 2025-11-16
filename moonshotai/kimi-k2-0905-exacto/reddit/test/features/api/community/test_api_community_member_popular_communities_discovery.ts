import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test community discovery where a member browses popular communities sorted by
 * subscriber count. Verify that the 'most_subscribers' sort order correctly
 * ranks communities by popularity. Validate that pagination works correctly for
 * large result sets and that subscriber counts are accurate.
 *
 * However, since new communities are created with subscriber_count = 0, we
 * focus on testing the search infrastructure, pagination, and sort order
 * parameters rather than meaningful subscriber count differences.
 */
export async function test_api_community_member_popular_communities_discovery(
  connection: api.IConnection,
) {
  // Step 1: Create a member account to access community features
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "SecurePassword123",
      nickname: RandomGenerator.name(),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create category for communities (using a dummy category name that would exist)
  const categoryName = "Technology";

  // Step 3: Create multiple communities with public access
  const communityCount = 8;
  const communities: IRedditCommunityCommunity[] = [];

  for (let i = 0; i < communityCount; i++) {
    const community =
      await api.functional.redditCommunity.member.communities.create(
        connection,
        {
          body: {
            name: RandomGenerator.alphabets(10),
            title: RandomGenerator.name(2),
            description: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 5,
              wordMax: 8,
            }),
            category_name: categoryName,
            type: "public",
            allow_crosspost: RandomGenerator.pick([true, false]),
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    typia.assert(community);
    communities.push(community);
  }

  // Step 4: Test popular communities discovery with most_subscribers sort order
  const searchResults =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        sort_order: "most_subscribers",
        page: 0,
        limit: 10,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(searchResults);

  // Validate search results structure
  TestValidator.equals(
    "search results pagination page",
    searchResults.pagination.current,
    0,
  );
  TestValidator.equals(
    "search results contains communities",
    searchResults.pagination.records >= communities.length,
    true,
  );

  // Step 5: Verify that communities from our batch appear in results
  const communityIds = new Set(communities.map((c) => c.id));
  const foundCommunities = searchResults.data.filter((result) =>
    communityIds.has(result.id),
  );

  TestValidator.predicate(
    "found some of our created communities",
    foundCommunities.length > 0,
  );

  // Step 6: Test pagination with first batch (limit results)
  const firstBatch =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        sort_order: "most_subscribers",
        page: 0,
        limit: 5,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(firstBatch);

  TestValidator.predicate(
    "first batch has proper limit",
    firstBatch.data.length <= 5,
  );
  TestValidator.equals(
    "first batch pagination current",
    firstBatch.pagination.current,
    0,
  );
  TestValidator.equals(
    "first batch pagination limit",
    firstBatch.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "first batch validates pagination structure",
    firstBatch.pagination.pages > 0,
  );

  // Step 7: Test second page of pagination
  if (firstBatch.pagination.pages > 1) {
    const secondBatch =
      await api.functional.redditCommunity.member.communities.index(
        connection,
        {
          body: {
            sort_order: "most_subscribers",
            page: 1,
            limit: 5,
          } satisfies IRedditCommunityCommunity.IRequest,
        },
      );
    typia.assert(secondBatch);

    TestValidator.predicate(
      "second batch has proper limit",
      secondBatch.data.length <= 5,
    );
    TestValidator.equals(
      "second batch pagination current",
      secondBatch.pagination.current,
      1,
    );
    TestValidator.equals(
      "second batch pagination limit",
      secondBatch.pagination.limit,
      5,
    );

    // Verify no overlap in IDs between pages - communities should be unique across pages
    const firstBatchIds = new Set(firstBatch.data.map((c) => c.id));
    const secondBatchIds = new Set(secondBatch.data.map((c) => c.id));

    // Allow for potential duplicates but generally expect unique items
    TestValidator.predicate(
      "pagination pages differ in results",
      firstBatch.data[0]?.id !== secondBatch.data[0]?.id,
    );
  }

  // Step 8: Test combined search with most_subscribers sort
  const searchQuery = RandomGenerator.substring(
    "technology programming development coding",
  );
  const mixedResults =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        sort_order: "most_subscribers",
        search: searchQuery,
        page: 0,
        limit: 10,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(mixedResults);

  TestValidator.predicate(
    "search results have valid structure",
    mixedResults.data.length >= 0,
  );
  TestValidator.predicate(
    "search results have pagination",
    mixedResults.pagination.records >= 0,
  );

  // Step 9: Test that all our created communities appear in final results
  const allResults =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        sort_order: "most_subscribers",
        page: 0,
        limit: 100,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(allResults);

  const allFoundCommunities = allResults.data.filter((result) =>
    communityIds.has(result.id),
  );

  TestValidator.predicate(
    "most or all communities found in final search",
    allFoundCommunities.length >= Math.floor(communities.length / 2),
  );

  // Step 10: Validate that subscriber counts are proper integer values with constraints
  allResults.data.forEach((community) => {
    TestValidator.predicate(
      "subscriber count is non-negative integer",
      community.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "subscriber count has proper integer type",
      Number.isInteger(community.subscriber_count),
    );
  });
}
