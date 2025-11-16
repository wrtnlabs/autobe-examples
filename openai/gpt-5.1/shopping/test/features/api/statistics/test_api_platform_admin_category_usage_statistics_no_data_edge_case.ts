import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategoryUsageStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryUsageStatistics";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate category usage statistics behavior when the platform has no catalog
 * or order data.
 *
 * Business context: Platform admins use the category-usage statistics endpoint
 * to understand how categories perform across products and orders. However,
 * immediately after provisioning a new platform admin on a fresh system, there
 * may be no categories, products, or orders at all. In this edge case, the
 * endpoint must still behave safely: it should return an empty-but-well-formed
 * statistics object rather than erroring out or returning partial/undefined
 * data.
 *
 * Steps:
 *
 * 1. Register a new platform admin using POST /auth/platformAdmin/join.
 *
 *    - This both creates the admin identity and configures the connection's
 *         Authorization header via the SDK.
 * 2. Do not create any categories, products, or orders. The environment is
 *    implicitly empty because this test uses a fresh admin and no other
 *    write-operations.
 * 3. Call GET /shoppingMall/platformAdmin/statistics/category-usage via the SDK
 *    function
 *    api.functional.shoppingMall.platformAdmin.statistics.category_usage.index.
 * 4. Validate that the response conforms to IShoppingMallCategoryUsageStatistics
 *    and that all aggregate metrics reflect the absence of data.
 *
 * Validations:
 *
 * - Typia.assert(output) to guarantee the response matches
 *   IShoppingMallCategoryUsageStatistics.
 * - Output.categories must be an empty array.
 * - Output.total_products must be 0.
 * - Output.total_order_lines must be 0.
 * - Output.total_distinct_customers must be 0.
 */
export async function test_api_platform_admin_category_usage_statistics_no_data_edge_case(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and establish authenticated context.
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    href: "https://admin.example.com/join", // valid URI
    referrer: "https://admin.example.com/landing", // valid URI
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Do not create any catalog or order data.
  //    We intentionally perform no additional operations here.

  // 3. Fetch category usage statistics for the empty environment.
  const stats: IShoppingMallCategoryUsageStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.category_usage.index(
      connection,
    );
  typia.assert<IShoppingMallCategoryUsageStatistics>(stats);

  // 4. Validate that metrics correctly reflect the absence of data.
  TestValidator.equals(
    "categories array should be empty when no catalog data exists",
    stats.categories,
    [],
  );

  TestValidator.equals(
    "total_products should be 0 when no products exist",
    stats.total_products,
    0,
  );

  TestValidator.equals(
    "total_order_lines should be 0 when no orders exist",
    stats.total_order_lines,
    0,
  );

  TestValidator.equals(
    "total_distinct_customers should be 0 when no orders exist",
    stats.total_distinct_customers,
    0,
  );
}
