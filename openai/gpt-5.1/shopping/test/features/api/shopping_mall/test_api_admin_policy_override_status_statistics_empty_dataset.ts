import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPolicyOverrideStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyOverrideStatusStatistics";

/**
 * Validate empty-dataset behavior of policy override status statistics for
 * admins.
 *
 * Business context: Administrative governance dashboards need to show
 * statistics about shopping_mall_policy_overrides grouped by status. When there
 * are no policy overrides recorded yet (such as immediately after bootstrapping
 * an admin account in a fresh environment), the statistics endpoint should
 * still return a structurally valid aggregation object instead of failing or
 * returning null/undefined.
 *
 * This test verifies that behavior by:
 *
 * 1. Registering a new admin through POST /auth/admin/join, which also establishes
 *    an authenticated admin session and injects the JWT access token into the
 *    SDK connection automatically.
 * 2. Calling GET /shoppingMall/admin/statistics/policyOverridesByStatus using the
 *    authenticated admin connection.
 * 3. Asserting that the response matches the
 *    IShoppingMallPolicyOverrideStatusStatistics structure via typia.assert.
 * 4. Asserting business semantics for an empty dataset: totalCount is 0 and items
 *    is an empty array.
 *
 * Note that this test assumes an environment (or tenant context) where there
 * are no records in shopping_mall_policy_overrides. If policy overrides exist,
 * the test will fail, signalling that the fixture is not in the expected
 * "empty" state.
 */
export async function test_api_admin_policy_override_status_statistics_empty_dataset(
  connection: api.IConnection,
) {
  // 1. Register a new admin (dependency: POST /auth/admin/join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Call the statistics endpoint as the authenticated admin
  const stats: IShoppingMallPolicyOverrideStatusStatistics =
    await api.functional.shoppingMall.admin.statistics.policyOverridesByStatus.index(
      connection,
    );

  // 3. Structural validation using typia.assert
  typia.assert<IShoppingMallPolicyOverrideStatusStatistics>(stats);

  // 4. Business validations for empty dataset semantics
  TestValidator.equals(
    "totalCount should be zero when there are no policy overrides",
    stats.totalCount,
    0,
  );

  TestValidator.equals(
    "items should be an empty array when there are no policy overrides",
    stats.items.length,
    0,
  );
}
