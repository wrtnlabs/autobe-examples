import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityRule";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test community rules retrieval with multiple filter parameters combined.
 *
 * This test validates that the rule search endpoint correctly handles multiple
 * filter parameters working together: search, sort_by, order, page, and limit.
 *
 * The test verifies that:
 *
 * 1. Search filtering is applied first to reduce the dataset
 * 2. Sorting is applied to the filtered results
 * 3. Pagination is applied last to the sorted, filtered results
 * 4. Pagination metadata reflects filtered counts, not total counts
 * 5. Various filter combinations work correctly without conflicts
 *
 * Process:
 *
 * 1. Create moderator account
 * 2. Create a community
 * 3. Create 15+ diverse rules with searchable content
 * 4. Test search + sort + pagination combinations
 * 5. Validate filter pipeline order and pagination accuracy
 */
export async function test_api_community_rules_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePass123!",
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const communityName =
    `test_${RandomGenerator.alphaNumeric(12)}`.toLowerCase();
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create 15 diverse rules with searchable keywords
  const keywords = [
    "spam",
    "respect",
    "topic",
    "quality",
    "self-promotion",
  ] as const;
  const createdRules: IRedditCommunityCommunityRule[] = [];

  for (let i = 0; i < 15; i++) {
    const keyword = RandomGenerator.pick(keywords);
    const rule =
      await api.functional.redditCommunity.moderator.communities.rules.create(
        connection,
        {
          communityName: community.name,
          body: {
            title: `Rule about ${keyword} - ${RandomGenerator.name(2)}`,
            description: `This rule prohibits ${keyword} and ensures ${RandomGenerator.paragraph({ sentences: 3 })}`,
            rule_number: i + 1,
          } satisfies IRedditCommunityCommunityRule.ICreate,
        },
      );
    typia.assert(rule);
    createdRules.push(rule);
  }

  // Step 4: Test combined filters - search + sort + pagination
  // Test 1: Search for "spam" keyword, sort by created_at descending, with pagination
  const searchResult1 =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        search: "spam",
        sort_by: "created_at",
        order: "desc",
        page: 1,
        limit: 5,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(searchResult1);

  // Validate search filtering worked
  TestValidator.predicate(
    "search results contain spam keyword",
    searchResult1.data.every(
      (rule) =>
        rule.title.toLowerCase().includes("spam") ||
        (rule.description?.toLowerCase().includes("spam") ?? false),
    ),
  );

  // Validate pagination metadata reflects filtered count, not total
  TestValidator.predicate(
    "pagination records should be less than or equal to total rules",
    searchResult1.pagination.records <= createdRules.length,
  );

  TestValidator.predicate(
    "pagination limit should match request",
    searchResult1.pagination.limit === 5,
  );

  // Test 2: Different sort field - sort by title ascending
  const searchResult2 =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        search: "respect",
        sort_by: "title",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(searchResult2);

  // Validate sorting on filtered results
  if (searchResult2.data.length > 1) {
    TestValidator.predicate(
      "results should be sorted by title ascending",
      searchResult2.data.every((rule, idx) => {
        if (idx === 0) return true;
        return searchResult2.data[idx - 1].title <= rule.title;
      }),
    );
  }

  // Test 3: Multi-page scenario - request second page
  const searchResult3Page1 =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        search: "rule",
        sort_by: "rule_number",
        order: "asc",
        page: 1,
        limit: 3,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(searchResult3Page1);

  const searchResult3Page2 =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        search: "rule",
        sort_by: "rule_number",
        order: "asc",
        page: 2,
        limit: 3,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(searchResult3Page2);

  // Validate pages are different and pagination metadata is consistent
  if (
    searchResult3Page1.data.length > 0 &&
    searchResult3Page2.data.length > 0
  ) {
    TestValidator.predicate(
      "page 1 and page 2 should have different rules",
      searchResult3Page1.data[0].id !== searchResult3Page2.data[0].id,
    );

    TestValidator.equals(
      "both pages should have same total records count",
      searchResult3Page1.pagination.records,
      searchResult3Page2.pagination.records,
    );

    TestValidator.equals(
      "both pages should have same total pages count",
      searchResult3Page1.pagination.pages,
      searchResult3Page2.pagination.pages,
    );
  }

  // Test 4: Sort by updated_at with descending order
  const searchResult4 =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        sort_by: "updated_at",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(searchResult4);

  TestValidator.predicate(
    "should return rules sorted by updated_at descending",
    searchResult4.data.every((rule, idx) => {
      if (idx === 0) return true;
      return searchResult4.data[idx - 1].updated_at >= rule.updated_at;
    }),
  );

  // Test 5: Edge case - search with no results
  const searchResult5 =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        search: "nonexistent_keyword_xyz123",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(searchResult5);

  TestValidator.equals(
    "no results should return empty data array",
    searchResult5.data.length,
    0,
  );

  TestValidator.equals(
    "no results should have zero records count",
    searchResult5.pagination.records,
    0,
  );

  TestValidator.equals(
    "no results should have zero pages count",
    searchResult5.pagination.pages,
    0,
  );

  // Test 6: Validate all rules without filters
  const allRulesResult =
    await api.functional.redditCommunity.communities.rules.index(connection, {
      communityName: community.name,
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityCommunityRule.IRequest,
    });
  typia.assert(allRulesResult);

  TestValidator.equals(
    "all rules should return all created rules",
    allRulesResult.pagination.records,
    createdRules.length,
  );
}
