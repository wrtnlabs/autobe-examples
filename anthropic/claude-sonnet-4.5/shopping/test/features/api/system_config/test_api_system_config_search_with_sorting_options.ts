import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemConfig";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test sorting functionality for system configuration lists.
 *
 * Validates that the system configuration search API correctly sorts results
 * based on different fields (config_key, category) and sort directions
 * (ascending, descending). This ensures administrators can effectively organize
 * and navigate configuration data.
 *
 * Test process:
 *
 * 1. Authenticate as admin user
 * 2. Test sorting by config_key in ascending order
 * 3. Test sorting by category in descending order
 * 4. Validate correct ordering for each sort combination
 */
export async function test_api_system_config_search_with_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to access system configuration functionality
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Test sorting by config_key in ascending order
  const sortByKeyAsc =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: {
        sort_by: "config_key",
        order: "asc",
      } satisfies IShoppingMallSystemConfig.IRequest,
    });
  typia.assert(sortByKeyAsc);

  // Validate ascending order for config_key
  if (sortByKeyAsc.data.length > 1) {
    for (let i = 0; i < sortByKeyAsc.data.length - 1; i++) {
      TestValidator.predicate(
        "config_key ascending order validation",
        sortByKeyAsc.data[i].config_key <= sortByKeyAsc.data[i + 1].config_key,
      );
    }
  }

  // Step 3: Test sorting by category in descending order
  const sortByCategoryDesc =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: {
        sort_by: "category",
        order: "desc",
      } satisfies IShoppingMallSystemConfig.IRequest,
    });
  typia.assert(sortByCategoryDesc);

  // Validate descending order for category
  if (sortByCategoryDesc.data.length > 1) {
    for (let i = 0; i < sortByCategoryDesc.data.length - 1; i++) {
      TestValidator.predicate(
        "category descending order validation",
        sortByCategoryDesc.data[i].category >=
          sortByCategoryDesc.data[i + 1].category,
      );
    }
  }
}
