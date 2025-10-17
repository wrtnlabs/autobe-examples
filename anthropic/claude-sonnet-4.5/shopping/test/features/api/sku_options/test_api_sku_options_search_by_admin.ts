import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuOption";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";

export async function test_api_sku_options_search_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with proper authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const adminRoleLevel = "super_admin";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      role_level: adminRoleLevel,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Validate admin authentication response data
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.equals("admin name matches", admin.name, adminName);
  TestValidator.equals(
    "admin role_level matches",
    admin.role_level,
    adminRoleLevel,
  );

  // Step 3: Search SKU options with default pagination
  const defaultSearch =
    await api.functional.shoppingMall.admin.skuOptions.index(connection, {
      body: {} satisfies IShoppingMallSkuOption.IRequest,
    });
  typia.assert(defaultSearch);

  // Step 4: Search with specific pagination parameters
  const customPageSearch =
    await api.functional.shoppingMall.admin.skuOptions.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSkuOption.IRequest,
    });
  typia.assert(customPageSearch);

  TestValidator.equals(
    "custom page current is 1",
    customPageSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom page limit is 10",
    customPageSearch.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "custom page data length is within limit",
    customPageSearch.data.length <= 10,
  );

  // Step 5: Search with option_name filter
  const filteredSearch =
    await api.functional.shoppingMall.admin.skuOptions.index(connection, {
      body: {
        option_name: "Storage Capacity",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSkuOption.IRequest,
    });
  typia.assert(filteredSearch);

  TestValidator.equals(
    "filtered search current page",
    filteredSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered search limit",
    filteredSearch.pagination.limit,
    20,
  );

  // Step 6: Test with maximum allowed limit
  const maxLimitSearch =
    await api.functional.shoppingMall.admin.skuOptions.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSkuOption.IRequest,
    });
  typia.assert(maxLimitSearch);

  TestValidator.equals(
    "max limit is 100",
    maxLimitSearch.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit data length is within limit",
    maxLimitSearch.data.length <= 100,
  );

  // Step 7: Verify business data when options exist
  if (defaultSearch.data.length > 0) {
    const firstOption = defaultSearch.data[0];
    TestValidator.predicate(
      "first option has option_name",
      firstOption.option_name.length > 0,
    );
    TestValidator.predicate(
      "first option has option_value",
      firstOption.option_value.length > 0,
    );
  }

  // Step 8: Test pagination calculations
  TestValidator.predicate(
    "pagination pages calculation is correct",
    defaultSearch.pagination.pages ===
      Math.ceil(
        defaultSearch.pagination.records / defaultSearch.pagination.limit,
      ),
  );
}
