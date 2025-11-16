import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

/**
 * Test controlling page size with the limit parameter at the administrator
 * level.
 *
 * Administrator authenticates and retrieves reports with different limit values
 * (1, 10, 50, 100). Verify that the response contains the correct number of
 * results matching the specified limit. Validate that administrators can
 * control how many reports are displayed per page and that the maximum limit of
 * 100 is enforced.
 *
 * Steps:
 *
 * 1. Create and authenticate as an administrator
 * 2. Request reports with limit=1 and validate result count
 * 3. Request reports with limit=10 and validate result count
 * 4. Request reports with limit=50 and validate result count
 * 5. Request reports with limit=100 and validate result count
 * 6. Verify pagination metadata reflects correct limits
 */
export async function test_api_moderation_report_queue_administrator_pagination_limit_control(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123";
  const adminUsername = RandomGenerator.alphabets(10);
  const adminName = RandomGenerator.name();
  const href = "https://example.com";

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: href,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test with limit=1
  const resultLimit1: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(resultLimit1);
  TestValidator.predicate(
    "limit=1 should return at most 1 item",
    resultLimit1.data.length <= 1,
  );
  TestValidator.equals(
    "pagination.limit should be 1",
    resultLimit1.pagination.limit,
    1,
  );

  // Step 3: Test with limit=10
  const resultLimit10: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(resultLimit10);
  TestValidator.predicate(
    "limit=10 should return at most 10 items",
    resultLimit10.data.length <= 10,
  );
  TestValidator.equals(
    "pagination.limit should be 10",
    resultLimit10.pagination.limit,
    10,
  );

  // Step 4: Test with limit=50
  const resultLimit50: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(resultLimit50);
  TestValidator.predicate(
    "limit=50 should return at most 50 items",
    resultLimit50.data.length <= 50,
  );
  TestValidator.equals(
    "pagination.limit should be 50",
    resultLimit50.pagination.limit,
    50,
  );

  // Step 5: Test with limit=100 (maximum)
  const resultLimit100: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(resultLimit100);
  TestValidator.predicate(
    "limit=100 should return at most 100 items",
    resultLimit100.data.length <= 100,
  );
  TestValidator.equals(
    "pagination.limit should be 100",
    resultLimit100.pagination.limit,
    100,
  );

  // Step 6: Verify pagination structure
  TestValidator.predicate(
    "pagination should have current page",
    resultLimit100.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have total records count",
    resultLimit100.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have total pages",
    resultLimit100.pagination.pages >= 0,
  );

  // Verify that different limits are properly respected
  TestValidator.predicate(
    "limit parameter controls result count",
    resultLimit1.data.length <= resultLimit10.data.length &&
      resultLimit10.data.length <= resultLimit50.data.length &&
      resultLimit50.data.length <= resultLimit100.data.length,
  );
}
