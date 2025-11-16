import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

/**
 * Test pagination functionality of moderation audit logs.
 *
 * This test validates that the audit log pagination system correctly handles:
 *
 * - Authentication as administrator
 * - Retrieving first page of results with specific limit
 * - Retrieving subsequent pages with consistent pagination
 * - Pagination metadata (current page, limit, total records, total pages)
 * - No data duplication across pages
 * - Edge cases for limit boundaries (minimum 1, maximum 100)
 *
 * Steps:
 *
 * 1. Create and authenticate as an administrator account
 * 2. Query audit logs with page=1 and limit=10 to get first page
 * 3. Verify pagination metadata is correct
 * 4. Query audit logs with page=2 and limit=10 to get second page
 * 5. Validate different pages return different data
 * 6. Test edge case with limit=1 (minimum)
 * 7. Test edge case with limit=100 (maximum)
 */
export async function test_api_moderation_audit_logs_pagination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: RandomGenerator.alphabets(12),
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Query audit logs with page=1 and limit=10
  const firstPageRequest = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const firstPageResult: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: firstPageRequest,
      },
    );
  typia.assert(firstPageResult);

  // Step 3: Verify pagination metadata
  TestValidator.equals(
    "first page number should be 1",
    firstPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should be 10",
    firstPageResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    firstPageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should match records divided by limit",
    firstPageResult.pagination.pages >=
      Math.ceil(firstPageResult.pagination.records / 10),
  );

  // Step 4: Query audit logs with page=2 and limit=10
  const secondPageRequest = {
    page: 2,
    limit: 10,
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const secondPageResult: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: secondPageRequest,
      },
    );
  typia.assert(secondPageResult);

  // Step 5: Validate different pages return different data
  TestValidator.equals(
    "second page number should be 2",
    secondPageResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit should be 10",
    secondPageResult.pagination.limit,
    10,
  );

  // Check for no duplication between pages if both have data
  if (firstPageResult.data.length > 0 && secondPageResult.data.length > 0) {
    const firstPageIds = firstPageResult.data.map((log) => log.id);
    const secondPageIds = secondPageResult.data.map((log) => log.id);
    const allIds = [...firstPageIds, ...secondPageIds];
    const uniqueIds = new Set(allIds);

    TestValidator.equals(
      "no duplicate IDs between pages",
      uniqueIds.size,
      allIds.length,
    );
  }

  // Step 6: Test edge case with limit=1 (minimum)
  const minLimitRequest = {
    page: 1,
    limit: 1,
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const minLimitResult: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: minLimitRequest,
      },
    );
  typia.assert(minLimitResult);

  TestValidator.equals(
    "minimum limit should be 1",
    minLimitResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "data length should be <= limit",
    minLimitResult.data.length <= 1,
  );

  // Step 7: Test edge case with limit=100 (maximum)
  const maxLimitRequest = {
    page: 1,
    limit: 100,
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const maxLimitResult: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: maxLimitRequest,
      },
    );
  typia.assert(maxLimitResult);

  TestValidator.equals(
    "maximum limit should be 100",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data length should be <= limit",
    maxLimitResult.data.length <= 100,
  );

  // Verify consistency across different limit requests
  TestValidator.equals(
    "total records should be consistent",
    firstPageResult.pagination.records,
    maxLimitResult.pagination.records,
  );
  TestValidator.equals(
    "total records should be consistent",
    firstPageResult.pagination.records,
    minLimitResult.pagination.records,
  );
}
