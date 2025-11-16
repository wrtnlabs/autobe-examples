import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLog";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformErrorLog";

/**
 * Validate admin error log search returns an empty page when filters are overly
 * restrictive.
 *
 * Business goal: Ensure that the admin observability endpoint for error logs
 * behaves correctly when a complex combination of filters yields no matching
 * records. Instead of failing with a validation or server error, it must return
 * a well-formed empty page response.
 *
 * End-to-end steps:
 *
 * 1. Register a new adminUser using POST /auth/adminUser/join and rely on the SDK
 *    to attach the access token to the connection.
 * 2. Create a system configuration entry via POST
 *    /communityPlatform/adminUser/systemConfigs so that the platform reflects
 *    an initialized configuration state.
 * 3. Call PATCH /communityPlatform/adminUser/errorLogs with an
 *    ICommunityPlatformErrorLog.IRequest that uses a time window far in the
 *    future and a very specific combination of service_name, environment,
 *    severity, and error_code that should not match any rows.
 * 4. Assert that:
 *
 *    - The call succeeds without throwing HttpError.
 *    - The returned IPageICommunityPlatformErrorLog.ISummary passes typia.assert.
 *    - Pagination.records === 0.
 *    - Pagination.pages === 0.
 *    - Data.length === 0.
 *
 * This guarantees that the search is robust to empty result sets and that the
 * endpoint behaves as a read-only listing API even under extreme filter
 * conditions.
 */
export async function test_api_admin_error_logs_search_with_multiple_filters_and_empty_result(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser and obtain authorized admin context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminP@ssw0rd" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create at least one system configuration entry to simulate
  //    initialized observability/logging configuration.
  const systemConfigBody = {
    category: "observability",
    config_key: "error_log_retention_days",
    value: "14",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const systemConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      { body: systemConfigBody },
    );
  typia.assert(systemConfig);

  // 3. Perform an error log search with an intentionally over-restrictive
  //    filter set that should produce an empty result.
  //    We choose a time window far in the future plus specific filters.
  const farFutureFrom = new Date("2999-01-01T00:00:00.000Z").toISOString();
  const farFutureTo = new Date("2999-12-31T23:59:59.000Z").toISOString();

  const searchRequestBody = {
    occurredFrom: farFutureFrom,
    occurredTo: farFutureTo,
    service_name: "non-existent-service-for-empty-search",
    environment: "non-existent-environment",
    severity: "critical",
    error_code: "NON_EXISTENT_ERROR_CODE_9999",
    exception_name: "NonExistentExceptionForEmptySearch",
    correlation_id: "00000000-0000-0000-0000-000000000000",
    query: "this-query-should-not-match-any-error-log-entries",
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sortBy: "occurred_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformErrorLog.IRequest;

  const page: IPageICommunityPlatformErrorLog.ISummary =
    await api.functional.communityPlatform.adminUser.errorLogs.index(
      connection,
      { body: searchRequestBody },
    );

  // 4. Validate response structure and empty pagination/data semantics.
  typia.assert(page);

  const pagination: IPage.IPagination = page.pagination;
  typia.assert(pagination);

  TestValidator.equals(
    "error log search with over-restrictive filters should return zero records",
    pagination.records,
    0,
  );

  // pages may be computed as 0 for empty result; assert exactly 0 as
  // per scenario description.
  TestValidator.equals(
    "error log search with over-restrictive filters should report zero pages",
    pagination.pages,
    0,
  );

  TestValidator.equals(
    "error log search with over-restrictive filters should return empty data array",
    page.data.length,
    0,
  );
}
