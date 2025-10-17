import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";

/**
 * Test admin deletion of custom SKU options with proper authentication
 * management.
 *
 * This test validates the admin SKU option deletion workflow including proper
 * authentication context management and basic deletion functionality. Due to
 * schema limitations where IShoppingMallSku.ICreate does not contain properties
 * to reference IShoppingMallSkuOption, this test focuses on the deletion
 * operation itself rather than referential integrity with active SKU
 * references.
 *
 * Test workflow:
 *
 * 1. Create and authenticate admin account
 * 2. Create custom SKU option using admin authentication
 * 3. Attempt to delete the custom SKU option
 * 4. Verify deletion completes (or fails appropriately based on business rules)
 */
export async function test_api_sku_option_admin_deletion_with_referential_integrity(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create custom SKU option using admin authentication
  const customOption: IShoppingMallSkuOption =
    await api.functional.shoppingMall.admin.skuOptions.create(connection, {
      body: {
        option_name: "Storage Capacity",
        option_value: "128GB",
      } satisfies IShoppingMallSkuOption.ICreate,
    });
  typia.assert(customOption);

  // Step 3: Attempt to delete the custom SKU option
  await api.functional.shoppingMall.admin.skuOptions.erase(connection, {
    optionId: customOption.id,
  });
}
