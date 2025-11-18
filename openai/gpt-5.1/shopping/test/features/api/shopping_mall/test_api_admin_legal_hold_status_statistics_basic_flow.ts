import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHoldStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldStatusStatistics";

/**
 * Validate that an authenticated admin can retrieve aggregated legal hold
 * statistics grouped by status without leaking individual legal hold details.
 *
 * Business workflow
 *
 * 1. Register a new administrator using POST /auth/admin/join to obtain an
 *    authenticated admin context (the SDK automatically attaches the access
 *    token to the connection headers).
 * 2. Call GET /shoppingMall/admin/statistics/legalHoldsByStatus to fetch
 *    aggregated legal hold statistics as
 *    IShoppingMallLegalHoldStatusStatistics.
 * 3. Validate the response structure with typia.assert.
 * 4. Enforce additional invariants:
 *
 *    - Root object has only `items` and `totalCount` fields.
 *    - `totalCount` is a non-negative integer.
 *    - Each row has only `status`, `count`, and optional `ratio` fields.
 *    - `status` is a non-empty string.
 *    - `count` is a non-negative integer.
 *    - If `ratio` exists, it is between 0 and 1 inclusive.
 *    - The sum of all row.count values does not exceed totalCount.
 *    - When totalCount is 0, all counts are 0 and any ratios are 0.
 *    - When totalCount is > 0, ratios (when present) are reasonably consistent with
 *         count / totalCount.
 * 5. By constraining allowed keys at the root and row levels, ensure the endpoint
 *    does not leak any individual legal hold identifiers or target details, but
 *    only aggregated statistics.
 */
export async function test_api_admin_legal_hold_status_statistics_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a new administrator (join) to obtain an authenticated context.
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Call the legal hold status statistics endpoint as the authenticated admin.
  const stats: IShoppingMallLegalHoldStatusStatistics =
    await api.functional.shoppingMall.admin.statistics.legalHoldsByStatus.index(
      connection,
    );
  typia.assert<IShoppingMallLegalHoldStatusStatistics>(stats);

  // 3. Root-level structural and key validation.
  const rootKeys = Object.keys(stats).sort();
  TestValidator.equals(
    "root object must only contain items and totalCount",
    rootKeys,
    ["items", "totalCount"].sort(),
  );

  // 4. Basic invariants on totalCount.
  TestValidator.predicate(
    "totalCount must be a non-negative integer",
    Number.isInteger(stats.totalCount) && stats.totalCount >= 0,
  );

  // 5. Per-row validation and aggregate computations.
  let sumCount = 0;

  for (const row of stats.items) {
    const rowKeys = Object.keys(row).sort();
    TestValidator.predicate(
      "row must only contain status, count, and optional ratio",
      rowKeys.every(
        (key) => key === "status" || key === "count" || key === "ratio",
      ),
    );

    TestValidator.predicate(
      "row.status must be a non-empty string",
      typeof row.status === "string" && row.status.length > 0,
    );

    TestValidator.predicate(
      "row.count must be a non-negative integer",
      Number.isInteger(row.count) && row.count >= 0,
    );

    sumCount += row.count;

    if (row.ratio !== undefined) {
      TestValidator.predicate(
        "row.ratio must be between 0 and 1 inclusive when defined",
        row.ratio >= 0 && row.ratio <= 1,
      );
    }
  }

  // 6. Aggregate relationship between sum of counts and totalCount.
  TestValidator.predicate(
    "sum of row.count values must not exceed totalCount",
    sumCount <= stats.totalCount,
  );

  if (stats.totalCount === 0) {
    // When there are no legal holds, all per-status counts must be zero and
    // any ratios must also be zero.
    for (const row of stats.items) {
      TestValidator.equals(
        "when totalCount is 0, row.count must be 0",
        row.count,
        0,
      );
      if (row.ratio !== undefined) {
        TestValidator.equals(
          "when totalCount is 0, row.ratio (if present) must be 0",
          row.ratio,
          0,
        );
      }
    }
  } else {
    // When there are legal holds, ratio (if present) should roughly match
    // count / totalCount within a small tolerance to allow rounding.
    const tolerance = 0.001;
    for (const row of stats.items) {
      if (row.ratio !== undefined) {
        const expected = row.count / stats.totalCount;
        const diff = Math.abs(row.ratio - expected);

        TestValidator.predicate(
          "row.ratio should be close to row.count / totalCount when defined",
          diff <= tolerance || Number.isNaN(expected),
        );
      }
    }
  }
}
