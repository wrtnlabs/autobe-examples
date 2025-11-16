import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberWarning";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberWarning";

/**
 * Test handling of queries that return no results to ensure proper empty state
 * behavior.
 *
 * This scenario validates edge case handling when calling the member warnings
 * endpoint with specific filters that match no warnings. The test verifies that
 * empty result sets are handled gracefully, returning valid 200 OK responses
 * with properly structured pagination metadata and empty data arrays.
 *
 * Test flow:
 *
 * 1. Create moderator account for authentication
 * 2. Query with non-existent member ID filter (no matching records)
 * 3. Query with violation category that has no warnings
 * 4. Query with warning count threshold higher than any issued warnings
 * 5. Query with future date range (no warnings created yet)
 *
 * Validations:
 *
 * - Empty data array returned []
 * - Pagination.records = 0
 * - Pagination.pages = 0 or 1
 * - HTTP 200 OK status
 * - Valid response structure maintained
 * - Pagination metadata present even with zero results
 */
export async function test_api_member_warnings_empty_results(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Query with non-existent member ID filter
  const nonExistentMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const resultNonExistentMember: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.moderator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          memberId: nonExistentMemberId,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(resultNonExistentMember);
  TestValidator.equals(
    "empty data array for non-existent member",
    resultNonExistentMember.data,
    [],
  );
  TestValidator.equals(
    "zero records for non-existent member",
    resultNonExistentMember.pagination.records,
    0,
  );
  TestValidator.predicate(
    "pages should be 0 or 1 for empty results",
    resultNonExistentMember.pagination.pages === 0 ||
      resultNonExistentMember.pagination.pages === 1,
  );

  // 3. Query with violation category that has no warnings
  const resultNoCategory: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.moderator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          violationCategory: "nonexistent_violation_category",
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(resultNoCategory);
  TestValidator.equals(
    "empty data array for non-existent category",
    resultNoCategory.data,
    [],
  );
  TestValidator.equals(
    "zero records for non-existent category",
    resultNoCategory.pagination.records,
    0,
  );

  // 4. Query with warning count threshold higher than any existing warnings
  const resultHighWarningCount: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.moderator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          warningCountMin: 1000000,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(resultHighWarningCount);
  TestValidator.equals(
    "empty data array for high warning threshold",
    resultHighWarningCount.data,
    [],
  );
  TestValidator.equals(
    "zero records for high warning threshold",
    resultHighWarningCount.pagination.records,
    0,
  );

  // 5. Query with future date range (no warnings created yet)
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const futureDateIso = futureDate.toISOString();
  const resultFutureDate: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.moderator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          createdDateFrom: futureDateIso,
          createdDateTo: futureDateIso,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(resultFutureDate);
  TestValidator.equals(
    "empty data array for future date range",
    resultFutureDate.data,
    [],
  );
  TestValidator.equals(
    "zero records for future date range",
    resultFutureDate.pagination.records,
    0,
  );

  // Verify pagination structure is valid even with empty results
  TestValidator.predicate(
    "pagination current page valid",
    resultFutureDate.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit valid",
    resultFutureDate.pagination.limit > 0,
  );
}
