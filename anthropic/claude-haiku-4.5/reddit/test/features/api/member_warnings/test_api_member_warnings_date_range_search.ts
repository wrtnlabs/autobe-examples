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
 * Test filtering member warnings by date range to validate temporal filtering
 * capabilities for analyzing member violations by time period.
 *
 * This test validates that the member warnings API correctly accepts and
 * processes date range filters. Moderators need to analyze violations by time
 * period to identify trends, focus on recent issues, and review historical
 * patterns. The test verifies that the API properly filters warnings based on
 * creation date ranges, handles pagination with temporal filters, and returns
 * results with correct timestamp ordering.
 *
 * Test workflow:
 *
 * 1. Create moderator account for accessing warning search functionality
 * 2. Search warnings with full date range (start of month to end of month)
 *
 *    - Verify API accepts date range parameters
 *    - Verify results are properly paginated
 *    - Verify timestamps fall within specified range if data exists
 * 3. Search with only createdDateFrom parameter (7 days ago)
 *
 *    - Verify API filters from start date forward
 *    - Verify results contain only recent warnings if data exists
 * 4. Search with only createdDateTo parameter (yesterday)
 *
 *    - Verify API filters up to end date
 *    - Verify results contain only warnings up to specified date
 * 5. Verify pagination structure and page information
 */
export async function test_api_member_warnings_date_range_search(
  connection: api.IConnection,
) {
  // Create moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(20),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Calculate date ranges for testing
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
  );
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Test 1: Search with full date range (start of month to end of month)
  const fullRangeSearch: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.moderator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          createdDateFrom: startOfMonth.toISOString(),
          createdDateTo: endOfMonth.toISOString(),
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(fullRangeSearch);

  // Verify all results fall within the specified date range
  if (fullRangeSearch.data.length > 0) {
    for (const warning of fullRangeSearch.data) {
      const warningDate = new Date(warning.createdAt);
      TestValidator.predicate(
        "warning creation date within full month range",
        warningDate >= startOfMonth && warningDate <= endOfMonth,
      );
    }
  }

  // Verify pagination records
  TestValidator.predicate(
    "pagination records count matches or exceeds returned data",
    fullRangeSearch.pagination.records >= fullRangeSearch.data.length,
  );

  TestValidator.predicate(
    "pagination current page is 1",
    fullRangeSearch.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit is 20",
    fullRangeSearch.pagination.limit === 20,
  );

  // Test 2: Search with only createdDateFrom (7 days ago)
  const recentWarningsSearch: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.moderator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          createdDateFrom: sevenDaysAgo.toISOString(),
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(recentWarningsSearch);

  // Verify all results are from the last 7 days forward
  if (recentWarningsSearch.data.length > 0) {
    for (const warning of recentWarningsSearch.data) {
      const warningDate = new Date(warning.createdAt);
      TestValidator.predicate(
        "warning creation date on or after 7 days ago",
        warningDate >= sevenDaysAgo,
      );
    }
  }

  // Test 3: Search with only createdDateTo (yesterday)
  const upToYesterdaySearch: IPageICommunityPlatformMemberWarning.ISummary =
    await api.functional.communityPlatform.moderator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          createdDateTo: yesterday.toISOString(),
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(upToYesterdaySearch);

  // Verify all results are up to the specified date
  if (upToYesterdaySearch.data.length > 0) {
    for (const warning of upToYesterdaySearch.data) {
      const warningDate = new Date(warning.createdAt);
      TestValidator.predicate(
        "warning creation date on or before yesterday",
        warningDate <= yesterday,
      );
    }
  }

  // Test 4: Verify pagination structure with date ranges
  TestValidator.predicate(
    "recent warnings pagination current page is 1",
    recentWarningsSearch.pagination.current === 1,
  );

  TestValidator.predicate(
    "recent warnings pagination limit is 20",
    recentWarningsSearch.pagination.limit === 20,
  );

  TestValidator.predicate(
    "total pages is non-negative",
    recentWarningsSearch.pagination.pages >= 0,
  );

  // Test 5: Verify pagination with date range to yesterday
  TestValidator.predicate(
    "yesterday search pagination current page is 1",
    upToYesterdaySearch.pagination.current === 1,
  );

  TestValidator.predicate(
    "yesterday search pagination records non-negative",
    upToYesterdaySearch.pagination.records >= 0,
  );
}
