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
 * Validate basic error log index search for platform admins with time-range and
 * pagination.
 *
 * Business context: Platform administrators must be able to inspect application
 * error logs using a flexible search API. A very common use case is: "Show me
 * recent errors in the last day, paginated with default settings". This test
 * ensures that a newly joined platform admin can authenticate and perform a
 * minimal search using only time-range and basic pagination, and that the
 * response conforms to the paginated summary DTO contract.
 *
 * Steps:
 *
 * 1. Register a new platform admin using POST /auth/platformAdmin/join. This also
 *    establishes an authenticated session via the SDK (Authorization header is
 *    automatically set from the returned token).
 * 2. Build a 24-hour time window ending at now, using ISO-8601 date-time strings
 *    for `from` and `to` as accepted by IShoppingMallErrorLog.IRequest.
 * 3. Call PATCH /shoppingMall/platformAdmin/errorLogs with a body that sets
 *    page=1, limit=10, and the computed from/to, leaving all other filters
 *    undefined so that backend defaults apply.
 * 4. Assert that the response is a valid IPageIShoppingMallErrorLog.ISummary via
 *    typia.assert.
 * 5. Validate pagination metadata from IPage.IPagination:
 *
 *    - Current is >= 0.
 *    - Limit is > 0.
 *    - Records is >= data.length.
 *    - Pages is either 0 when records == 0, otherwise pages >= 1.
 * 6. If data is non-empty, perform additional checks:
 *
 *    - Each error summary has non-empty id, severity, message, and created_at.
 *    - Created_at timestamps fall within the requested [from, to] window.
 *    - Created_at values are sorted in descending order (newest first) by checking
 *         consecutive pairs.
 */
export async function test_api_platform_admin_error_logs_index_basic_search(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (join) to obtain an authorized session.
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Compute a 24-hour window ending at now.
  const now = new Date();
  const fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fromIso = fromDate.toISOString();
  const toIso = now.toISOString();

  // 3. Call errorLogs.index with minimal request: page=1, limit=10, from/to.
  const requestBody = {
    page: 1,
    limit: 10,
    from: fromIso,
    to: toIso,
  } satisfies IShoppingMallErrorLog.IRequest;

  const page: IPageIShoppingMallErrorLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.errorLogs.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallErrorLog.ISummary>(page);

  const pagination = page.pagination;
  const data = page.data;

  // 5. Basic pagination invariants.
  TestValidator.predicate(
    "pagination.current must be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit must be positive",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records must be >= data.length",
    pagination.records >= data.length,
  );

  if (pagination.records === 0) {
    TestValidator.equals(
      "when no records, pages must be 0",
      pagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "when records > 0, pages must be at least 1",
      pagination.pages >= 1,
    );
  }

  // 6. If there is data, check per-item constraints and sorting.
  if (data.length > 0) {
    for (const item of data) {
      // Core summary fields should be non-empty strings.
      TestValidator.predicate(
        "error log id should be non-empty",
        item.id.length > 0,
      );
      TestValidator.predicate(
        "severity should be non-empty",
        item.severity.length > 0,
      );
      TestValidator.predicate(
        "message should be non-empty",
        item.message.length > 0,
      );

      const createdAtTime = Date.parse(item.created_at);
      const fromTime = Date.parse(fromIso);
      const toTime = Date.parse(toIso);

      TestValidator.predicate(
        "created_at should be within requested window",
        createdAtTime >= fromTime && createdAtTime <= toTime,
      );
    }

    // Verify default sort order: created_at descending (newest first).
    for (let i = 1; i < data.length; i++) {
      const prev = Date.parse(data[i - 1].created_at);
      const curr = Date.parse(data[i].created_at);
      TestValidator.predicate(
        "error logs should be sorted by created_at descending",
        prev >= curr,
      );
    }
  }
}
