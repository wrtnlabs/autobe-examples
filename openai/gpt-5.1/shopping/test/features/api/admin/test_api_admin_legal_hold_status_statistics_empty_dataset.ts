import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHoldStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldStatusStatistics";

/**
 * Validate legal hold status statistics on an empty dataset.
 *
 * Business goal:
 *
 * - Ensure that when there are no records in shopping_mall_legal_holds (or all
 *   records are outside aggregation scope), the admin statistics endpoint
 *   /shoppingMall/admin/statistics/legalHoldsByStatus still returns a valid
 *   IShoppingMallLegalHoldStatusStatistics object with:
 *
 *   - TotalCount === 0
 *   - Items is an empty array.
 * - Ensure that the response continues to satisfy the DTO contract so admin
 *   dashboards can rely on a stable shape even for zero-state views.
 *
 * Steps:
 *
 * 1. Join an admin using POST /auth/admin/join to get an authenticated
 *    IShoppingMallAdmin.IAuthorized context (connection gains Authorization).
 * 2. Call GET /shoppingMall/admin/statistics/legalHoldsByStatus.
 * 3. Assert the response using
 *    typia.assert<IShoppingMallLegalHoldStatusStatistics>().
 * 4. Assert business-specific expectations for the empty dataset:
 *
 *    - TotalCount === 0
 *    - Items.length === 0
 * 5. Assert simple invariants: items.length === 0 implies totalCount === 0.
 */
export async function test_api_admin_legal_hold_status_statistics_empty_dataset(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated admin context.
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Call the statistics endpoint assuming no legal holds exist in fixture DB.
  const stats =
    await api.functional.shoppingMall.admin.statistics.legalHoldsByStatus.index(
      connection,
    );

  // 3. Type-level assertion for the response shape.
  typia.assert<IShoppingMallLegalHoldStatusStatistics>(stats);

  // 4. Business expectations for empty dataset.
  TestValidator.equals(
    "legal hold statistics totalCount should be zero when dataset is empty",
    stats.totalCount,
    0,
  );

  TestValidator.equals(
    "legal hold statistics items should be an empty array when dataset is empty",
    stats.items.length,
    0,
  );

  // 5. Invariant: if items are empty, totalCount must be zero.
  TestValidator.predicate(
    "when items array is empty, totalCount must also be zero",
    stats.items.length === 0 && stats.totalCount === 0,
  );
}
