import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHoldStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldStatusStatistics";

/**
 * Validate aggregated legal hold status statistics for admin dashboards.
 *
 * Business goal: Ensure that an authenticated administrator can retrieve a
 * coherent aggregation of legal holds grouped by status via GET
 * /shoppingMall/admin/statistics/legalHoldsByStatus, and that the returned
 * summary structure is internally consistent.
 *
 * Given we cannot control the exact seeded fixture data from this test, we
 * focus on invariants that must always hold regardless of the concrete
 * distribution of statuses:
 *
 * 1. An admin can successfully join via POST /auth/admin/join and receive a valid
 *    authorization context. The SDK will automatically propagate the access
 *    token into the connection headers.
 * 2. With an authenticated admin connection, calling
 *    api.functional.shoppingMall.admin.statistics.legalHoldsByStatus.index must
 *    succeed and return a value compatible with
 *    IShoppingMallLegalHoldStatusStatistics.
 * 3. The sum of all row-level `count` values in `items` must equal `totalCount`.
 * 4. All `count` values must be non-negative integers (already enforced by DTO
 *    tags, but we assert business-level expectations such as non-negativity via
 *    TestValidator where meaningful).
 * 5. For any row that provides a `ratio`, the value must be between 0 and 1 and,
 *    when totalCount is greater than zero, it should be reasonably close to
 *    `count / totalCount` within a small floating point tolerance.
 * 6. If totalCount is zero, then every row must have count === 0 and any provided
 *    ratio should be 0 (or very close to it).
 *
 * This test intentionally does not assert specific status bucket names or
 * counts, because those depend on external fixtures. Instead, it verifies that
 * the aggregated statistics form a mathematically and logically coherent
 * summary suitable for admin dashboards.
 */
export async function test_api_admin_legal_hold_status_statistics_multiple_status_buckets(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication setup)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  // Validate the authorization payload structure
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Call the legal hold status statistics endpoint as authenticated admin
  const stats: IShoppingMallLegalHoldStatusStatistics =
    await api.functional.shoppingMall.admin.statistics.legalHoldsByStatus.index(
      connection,
    );
  typia.assert<IShoppingMallLegalHoldStatusStatistics>(stats);

  // 3. Basic structural and aggregation checks
  const totalCount = stats.totalCount;

  // Sum of all row counts
  const sumOfCounts = stats.items.reduce((acc, row) => acc + row.count, 0);

  TestValidator.equals(
    "sum of row counts must equal totalCount",
    sumOfCounts,
    totalCount,
  );

  // 4. When totalCount is zero, all rows must have zero count
  if (totalCount === 0) {
    for (const row of stats.items) {
      TestValidator.equals(
        `row '${row.status}' count is zero when totalCount is zero`,
        row.count,
        0,
      );

      if (row.ratio !== undefined) {
        TestValidator.predicate(
          `row '${row.status}' ratio is within [0, 1] when totalCount is zero`,
          row.ratio >= 0 && row.ratio <= 1,
        );
        TestValidator.predicate(
          `row '${row.status}' ratio is effectively zero when totalCount is zero`,
          Math.abs(row.ratio) < 1e-6,
        );
      }
    }
    return;
  }

  // 5. When totalCount is positive, validate each row
  for (const row of stats.items) {
    // count should be between 0 and totalCount
    TestValidator.predicate(
      `row '${row.status}' count is non-negative and not greater than totalCount`,
      row.count >= 0 && row.count <= totalCount,
    );

    if (row.ratio !== undefined) {
      // Ratio must be in [0,1]
      TestValidator.predicate(
        `row '${row.status}' ratio is within [0, 1]`,
        row.ratio >= 0 && row.ratio <= 1,
      );

      const expected = totalCount === 0 ? 0 : row.count / totalCount;
      const tolerance = 1e-6;
      const diff = Math.abs(row.ratio - expected);

      TestValidator.predicate(
        `row '${row.status}' ratio is close to count / totalCount`,
        diff <= tolerance || expected === 0,
      );
    }
  }
}
