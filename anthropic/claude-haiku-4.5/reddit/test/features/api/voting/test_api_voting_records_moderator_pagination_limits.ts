import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Validates moderator pagination limit controls for voting records.
 *
 * This test ensures that moderators can effectively control the pagination page
 * size using the limit parameter within the valid range of 1-100. The test
 * authenticates a moderator account, then performs multiple API calls to
 * retrieve voting records with different limit values to verify that:
 *
 * 1. The limit parameter correctly constrains the maximum records returned per
 *    page
 * 2. Response data never exceeds the specified limit value
 * 3. Pagination metadata adjusts correctly based on the limit parameter
 * 4. Edge cases (limit=1, limit=100) work correctly
 * 5. Page navigation respects the configured limit across multiple pages
 *
 * Steps:
 *
 * 1. Create a moderator account with authentication
 * 2. Request voting records with limit=10 and verify response has ≤10 records
 * 3. Request voting records with limit=50 and verify response has ≤50 records
 * 4. Request voting records with limit=100 and verify response has ≤100 records
 * 5. Verify pagination metadata (current page, limit, total records, total pages)
 *    are consistent
 * 6. Test with different page numbers to ensure limit is applied consistently
 */
export async function test_api_voting_records_moderator_pagination_limits(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test pagination with limit=10
  const page10: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(page10);
  TestValidator.predicate(
    "page 1 with limit 10 should not exceed 10 records",
    page10.data.length <= 10,
  );
  TestValidator.equals(
    "limit should be 10 in pagination",
    page10.pagination.limit,
    10,
  );
  TestValidator.equals(
    "current page should be 1",
    page10.pagination.current,
    1,
  );

  // Step 3: Test pagination with limit=50
  const page50: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(page50);
  TestValidator.predicate(
    "page 1 with limit 50 should not exceed 50 records",
    page50.data.length <= 50,
  );
  TestValidator.equals(
    "limit should be 50 in pagination",
    page50.pagination.limit,
    50,
  );

  // Step 4: Test pagination with limit=100 (maximum)
  const page100: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(page100);
  TestValidator.predicate(
    "page 1 with limit 100 should not exceed 100 records",
    page100.data.length <= 100,
  );
  TestValidator.equals(
    "limit should be 100 in pagination",
    page100.pagination.limit,
    100,
  );

  // Step 5: Test pagination with limit=1 (minimum)
  const page1: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(page1);
  TestValidator.predicate(
    "page 1 with limit 1 should not exceed 1 record",
    page1.data.length <= 1,
  );
  TestValidator.equals(
    "limit should be 1 in pagination",
    page1.pagination.limit,
    1,
  );

  // Step 6: Verify pagination consistency across multiple pages with limit=50
  if (page50.pagination.pages > 1) {
    const page2: IPageICommunityPlatformVote =
      await api.functional.communityPlatform.moderator.votes.index(connection, {
        body: {
          page: 2,
          limit: 50,
        } satisfies ICommunityPlatformVote.IRequest,
      });
    typia.assert(page2);
    TestValidator.predicate(
      "page 2 with limit 50 should not exceed 50 records",
      page2.data.length <= 50,
    );
    TestValidator.equals(
      "page 2 should have same limit as page 1",
      page2.pagination.limit,
      page50.pagination.limit,
    );
    TestValidator.equals(
      "current page should be 2",
      page2.pagination.current,
      2,
    );
  }

  // Step 7: Verify that total records and pages calculations are consistent
  TestValidator.predicate(
    "total pages calculation should be consistent",
    page100.pagination.pages ===
      Math.ceil(page100.pagination.records / page100.pagination.limit),
  );

  // Step 8: Verify different limits return consistent total record counts
  TestValidator.equals(
    "total records should be same regardless of limit",
    page10.pagination.records,
    page50.pagination.records,
  );
  TestValidator.equals(
    "total records should match across all limit values",
    page50.pagination.records,
    page100.pagination.records,
  );
}
