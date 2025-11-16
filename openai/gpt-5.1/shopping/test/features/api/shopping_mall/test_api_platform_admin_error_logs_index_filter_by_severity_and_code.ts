import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallErrorLog";
import type { IShoppingMallErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallErrorLog";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate filtering of platform admin error logs by severity and error_code.
 *
 * Business purpose: This test ensures that the platform-admin-facing error log
 * search API correctly honors severity and error_code filters and that
 * pagination metadata remains consistent. Platform administrators rely on this
 * endpoint to triage incidents, so it must reliably narrow results according to
 * these core filters.
 *
 * High-level workflow:
 *
 * 1. Join a new platform admin via POST /auth/platformAdmin/join to obtain an
 *    authenticated session and JWT tokens. The SDK automatically wires the
 *    access token into the connection headers for subsequent calls.
 * 2. Perform an initial, effectively unfiltered error log search via PATCH
 *    /shoppingMall/platformAdmin/errorLogs using only pagination parameters
 *    (page, limit). This provides a baseline sample of logs.
 * 3. If the unfiltered query returns at least one log entry and that entry has a
 *    defined error_code, derive a severity and error_code pair from that first
 *    item.
 * 4. Perform a second, filtered search using the derived severity and error_code
 *    with the same pagination settings.
 * 5. Assert that:
 *
 *    - Both responses conform to IPageIShoppingMallErrorLog.ISummary via
 *         typia.assert.
 *    - Pagination metadata (current, limit, records, pages) is internally consistent
 *         for each response.
 *    - For the filtered response, every item has severity exactly equal to the
 *         requested severity.
 *    - For the filtered response, any item that has error_code defined has
 *         error_code exactly equal to the requested error_code.
 *    - The filtered response's total records count is less than or equal to the
 *         unfiltered response's total records count.
 *
 * Implementation notes:
 *
 * - Because the test cannot control seeding of shopping_mall_error_logs, it
 *   derives realistic filter values directly from the first page of the
 *   unfiltered query instead of assuming known severity codes.
 * - If the baseline query returns no data or the first item's error_code is
 *   undefined, the test still validates the unfiltered response structure and
 *   pagination but skips the filtered comparison to avoid brittle assumptions
 *   about data availability.
 */
export async function test_api_platform_admin_error_logs_index_filter_by_severity_and_code(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform admin via join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    // ip is optional and can be omitted; href/referrer must be valid URIs
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "platform admin account is active",
    admin.isActive === true,
  );

  // 2. Perform initial "unfiltered" error log search with only pagination
  const page = 1 as number & tags.Type<"int32">;
  const limit = 20 as number & tags.Type<"int32">;

  const unfilteredRequest = {
    page,
    limit,
  } satisfies IShoppingMallErrorLog.IRequest;

  const unfiltered: IPageIShoppingMallErrorLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.errorLogs.index(
      connection,
      { body: unfilteredRequest },
    );
  typia.assert(unfiltered);

  // Basic pagination sanity checks for unfiltered results
  const unfilteredPage = unfiltered.pagination;
  TestValidator.predicate(
    "unfiltered: records non-negative",
    unfilteredPage.records >= 0,
  );
  TestValidator.predicate(
    "unfiltered: limit matches request",
    unfilteredPage.limit === limit,
  );
  TestValidator.predicate(
    "unfiltered: pages non-negative",
    unfilteredPage.pages >= 0,
  );

  // 3. Derive severity and error_code from first item if available
  const firstLog: IShoppingMallErrorLog.ISummary | undefined =
    unfiltered.data[0];

  if (!firstLog || firstLog.error_code === undefined) {
    // No suitable sample to build filters from; we still validated the
    // unfiltered response above and can end the test early.
    return;
  }

  const filterSeverity: string = firstLog.severity;
  const filterErrorCode: string = firstLog.error_code;

  // 4. Perform filtered search using derived severity and error_code
  const filteredRequest = {
    page,
    limit,
    severity: filterSeverity,
    error_code: filterErrorCode,
  } satisfies IShoppingMallErrorLog.IRequest;

  const filtered: IPageIShoppingMallErrorLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.errorLogs.index(
      connection,
      { body: filteredRequest },
    );
  typia.assert(filtered);

  const filteredPage = filtered.pagination;

  // 5-1. Pagination sanity checks for filtered results
  TestValidator.predicate(
    "filtered: records non-negative",
    filteredPage.records >= 0,
  );
  TestValidator.predicate(
    "filtered: limit matches request",
    filteredPage.limit === limit,
  );
  TestValidator.predicate(
    "filtered: pages non-negative",
    filteredPage.pages >= 0,
  );

  // 5-2. Verify all items match severity and error_code filters
  for (const item of filtered.data) {
    TestValidator.equals(
      "filtered: item.severity equals requested severity",
      item.severity,
      filterSeverity,
    );

    if (item.error_code !== undefined) {
      TestValidator.equals(
        "filtered: item.error_code equals requested error_code when defined",
        item.error_code,
        filterErrorCode,
      );
    }
  }

  // 5-3. Verify that filtered records count does not exceed unfiltered
  TestValidator.predicate(
    "filtered: total records not greater than unfiltered",
    filteredPage.records <= unfilteredPage.records,
  );
}
