import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteScore";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteScore";

/**
 * Test basic pagination functionality for vote scores search operation.
 *
 * This test validates that administrators can retrieve paginated results with
 * default sorting by calculated_at timestamp in descending order. It verifies
 * that page and limit parameters work correctly, returning the expected number
 * of records per page and proper pagination metadata.
 *
 * Implementation Steps:
 *
 * 1. Create and authenticate as an administrator
 * 2. Search vote scores with pagination parameters
 * 3. Validate pagination metadata structure
 * 4. Verify default sorting behavior
 * 5. Test multiple page and limit combinations
 */
export async function test_api_vote_scores_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Create and authenticate as an administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123456",
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Search vote scores with default pagination (page 1, limit 10)
  const firstPage: IPageICommunityPlatformVoteScore.ISummary =
    await api.functional.communityPlatform.admin.voteScores.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVoteScore.IRequest,
    });
  typia.assert(firstPage);

  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination object exists",
    firstPage.pagination !== undefined,
    true,
  );
  TestValidator.equals("current page is 1", firstPage.pagination.current, 1);
  TestValidator.equals("limit is 10", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    firstPage.pagination.pages >= 0,
  );

  // 4. Verify data array matches pagination limit
  TestValidator.predicate(
    "data array length does not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );

  // 5. Test different page and limit combinations
  const secondPage: IPageICommunityPlatformVoteScore.ISummary =
    await api.functional.communityPlatform.admin.voteScores.index(connection, {
      body: {
        page: 2,
        limit: 5,
      } satisfies ICommunityPlatformVoteScore.IRequest,
    });
  typia.assert(secondPage);

  // Validate second page metadata
  TestValidator.equals(
    "second page current is 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit is 5",
    secondPage.pagination.limit,
    5,
  );

  // 6. Test with maximum limit
  const maxLimitPage: IPageICommunityPlatformVoteScore.ISummary =
    await api.functional.communityPlatform.admin.voteScores.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformVoteScore.IRequest,
    });
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit page limit is 100",
    maxLimitPage.pagination.limit,
    100,
  );

  // 7. Verify default sorting behavior (if data exists)
  if (firstPage.data.length > 1) {
    // Check that records are sorted by calculated_at descending (newer first)
    for (let i = 1; i < firstPage.data.length; i++) {
      const current = new Date(firstPage.data[i].calculated_at);
      const previous = new Date(firstPage.data[i - 1].calculated_at);
      TestValidator.predicate(
        `record ${i} calculated_at is earlier than or equal to record ${i - 1} (descending order)`,
        current <= previous,
      );
    }
  }

  // 8. Test pagination consistency
  if (firstPage.pagination.pages > 1) {
    TestValidator.predicate(
      "total pages calculation is consistent",
      firstPage.pagination.pages ===
        Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
    );
  }
}
