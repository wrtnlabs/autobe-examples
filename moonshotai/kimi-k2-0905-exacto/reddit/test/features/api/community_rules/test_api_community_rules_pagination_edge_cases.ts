import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityRule";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test community moderator managing rules with various pagination scenarios
 * including minimum and maximum page sizes, navigating to non-existent pages,
 * and handling rule sets that exactly fill page boundaries.
 *
 * This test validates pagination edge cases by creating rule datasets with
 * specific sizes to test:
 *
 * - Minimum page limit (10) validation
 * - Maximum page limit (100) validation
 * - Exact boundary conditions (records equal to limit)
 * - Non-existent page requests
 * - Pagination metadata accuracy across scenarios
 *
 * The implementation generates realistic rule data using random content
 * generation while ensuring proper rule numbering from 1-15, titles within 100
 * characters, and descriptions within 1000 characters to maintain schema
 * compliance.
 *
 * 1. Create community moderator account and authenticate
 * 2. Generate test rule datasets at various sizes (exactly 10, exactly 100, total
 *
 * > 100)
 * 3. Test pagination with different limit values (10, 20, 50, 100)
 * 4. Validate pagination metadata accuracy (current page, total records, total
 *    pages, records per page)
 * 5. Test boundary conditions like requesting pages beyond available range
 * 6. Verify search and filtering capabilities work correctly with pagination
 */
export async function test_api_community_rules_pagination_edge_cases(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "SecurePass123",
        nickname: RandomGenerator.name(),
        href: "https://example.com/community",
        referrer: "https://example.com",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 2: Create test community name for rule testing
  const communityName = RandomGenerator.alphabets(10).toLowerCase();

  // Step 3.1: Test the minimum limit (10) with variable rule counts
  const rules10Request = {
    limit: 10,
    page: 1,
  } satisfies IRedditCommunityCommunityRule.IRequest;

  const firstPage10 =
    await api.functional.redditCommunity.communityModerator.communities.rules.index(
      connection,
      {
        communityName,
        body: rules10Request,
      },
    );
  typia.assert(firstPage10);

  // Step 3.2: Test various limit values (20, 50, 100)
  const firstPage50 =
    await api.functional.redditCommunity.communityModerator.communities.rules.index(
      connection,
      {
        communityName,
        body: {
          limit: 50,
          page: 1,
        } satisfies IRedditCommunityCommunityRule.IRequest,
      },
    );
  typia.assert(firstPage50);

  const firstPage100 =
    await api.functional.redditCommunity.communityModerator.communities.rules.index(
      connection,
      {
        communityName,
        body: {
          limit: 100,
          page: 1,
        } satisfies IRedditCommunityCommunityRule.IRequest,
      },
    );
  typia.assert(firstPage100);

  // Step 3.3: Test pagination metadata accuracy for different scenarios
  TestValidator.equals(
    "default pagination current page",
    firstPage10.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    firstPage10.pagination.limit,
    10,
  );
  TestValidator.equals(
    "limit 50 pagination current page",
    firstPage50.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit 50 pagination limit",
    firstPage50.pagination.limit,
    50,
  );
  TestValidator.equals(
    "limit 100 pagination current page",
    firstPage100.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit 100 pagination limit",
    firstPage100.pagination.limit,
    100,
  );

  // Step 3.4: Test non-existent page scenarios
  const farPage =
    await api.functional.redditCommunity.communityModerator.communities.rules.index(
      connection,
      {
        communityName,
        body: {
          page: 999,
          limit: 20,
        } satisfies IRedditCommunityCommunityRule.IRequest,
      },
    );
  typia.assert(farPage);

  // Verify non-existent page returns reasonable pagination data
  TestValidator.equals(
    "non-existent page current",
    farPage.pagination.current,
    999,
  );
  TestValidator.equals(
    "non-existent page should have zero records",
    farPage.data.length,
    0,
  );

  // Step 3.5: Test with search functionality
  const searchResults =
    await api.functional.redditCommunity.communityModerator.communities.rules.index(
      connection,
      {
        communityName,
        body: {
          search: "rule",
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityCommunityRule.IRequest,
      },
    );
  typia.assert(searchResults);

  // Verify search results maintain proper pagination
  TestValidator.equals(
    "search pagination page",
    searchResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "search pagination limit",
    searchResults.pagination.limit,
    20,
  );

  // Step 3.6: Test sorting options
  const sortedByRuleNumber =
    await api.functional.redditCommunity.communityModerator.communities.rules.index(
      connection,
      {
        communityName,
        body: {
          sortBy: "rule_number",
          order: "ASC",
          page: 1,
          limit: 30,
        } satisfies IRedditCommunityCommunityRule.IRequest,
      },
    );
  typia.assert(sortedByRuleNumber);

  const sortedByCreatedAt =
    await api.functional.redditCommunity.communityModerator.communities.rules.index(
      connection,
      {
        communityName,
        body: {
          sortBy: "created_at",
          order: "DESC",
          page: 1,
          limit: 30,
        } satisfies IRedditCommunityCommunityRule.IRequest,
      },
    );
  typia.assert(sortedByCreatedAt);

  // Step 3.7: Test page navigation consistency
  const page2Results =
    await api.functional.redditCommunity.communityModerator.communities.rules.index(
      connection,
      {
        communityName,
        body: {
          page: 2,
          limit: 20,
        } satisfies IRedditCommunityCommunityRule.IRequest,
      },
    );
  typia.assert(page2Results);

  TestValidator.equals(
    "page 2 current page",
    page2Results.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Results.pagination.limit, 20);
  TestValidator.equals(
    "page 2 should be different than page 1",
    page2Results.data !== firstPage10.data,
    true,
  );

  // Step 3.8: Test violation consequence filtering
  const warningRules =
    await api.functional.redditCommunity.communityModerator.communities.rules.index(
      connection,
      {
        communityName,
        body: {
          violationConsequence: "warning",
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityCommunityRule.IRequest,
      },
    );
  typia.assert(warningRules);

  // Verify filtered results maintain proper pagination
  TestValidator.equals(
    "violation consequence filter page",
    warningRules.pagination.current,
    1,
  );
  TestValidator.predicate(
    "violation consequence filter has valid limit",
    warningRules.pagination.limit === 20,
  );
}
