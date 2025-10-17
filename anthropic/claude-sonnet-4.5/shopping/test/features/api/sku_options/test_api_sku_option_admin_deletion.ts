import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";

/**
 * Test admin capability to delete custom SKU options across the entire
 * platform.
 *
 * This test validates that administrators have the authority to permanently
 * delete custom SKU options from the shopping mall platform. The test workflow
 * includes:
 *
 * 1. Create a new admin account with appropriate role level
 * 2. Authenticate the admin to obtain authorization tokens
 * 3. Create a custom SKU option (e.g., storage capacity, material type)
 * 4. Delete the custom SKU option using admin privileges
 * 5. Validate successful completion of the deletion operation
 *
 * The deletion operation is a hard delete that permanently removes the option
 * record from the shopping_mall_sku_options table. The system logs the deletion
 * with admin actor information and timestamp for audit purposes.
 *
 * This ensures admins have broader deletion authority compared to sellers for
 * platform-wide custom option management and cleanup operations.
 */
export async function test_api_sku_option_admin_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create new admin account
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Step 2: Admin is now authenticated (SDK automatically handles token)

  // Step 3: Create a custom SKU option for testing deletion
  const skuOptionCreateData = {
    option_name: "Storage Capacity",
    option_value: "128GB",
  } satisfies IShoppingMallSkuOption.ICreate;

  const createdOption: IShoppingMallSkuOption =
    await api.functional.shoppingMall.admin.skuOptions.create(connection, {
      body: skuOptionCreateData,
    });
  typia.assert(createdOption);

  // Validate created option has valid UUID and matches input data
  TestValidator.equals(
    "created option name matches input",
    createdOption.option_name,
    skuOptionCreateData.option_name,
  );
  TestValidator.equals(
    "created option value matches input",
    createdOption.option_value,
    skuOptionCreateData.option_value,
  );

  // Step 4: Delete the custom SKU option using admin privileges
  await api.functional.shoppingMall.admin.skuOptions.erase(connection, {
    optionId: createdOption.id,
  });

  // Step 5: Deletion completed successfully (void return, no error thrown)
  // The operation represents a hard delete - the option is permanently removed
}
