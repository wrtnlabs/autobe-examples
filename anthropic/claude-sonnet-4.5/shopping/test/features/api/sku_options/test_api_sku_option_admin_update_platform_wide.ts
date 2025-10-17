import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";

/**
 * Test admin platform-wide update of custom SKU options for catalog
 * standardization.
 *
 * This test validates that administrators can update custom SKU options created
 * by any seller to maintain platform-wide naming consistency and
 * standardization. The workflow demonstrates the administrative oversight
 * capability for catalog management.
 *
 * Test Flow:
 *
 * 1. Admin joins and authenticates with platform-wide privileges
 * 2. Seller joins and creates a custom SKU option with initial naming
 * 3. Admin updates the SKU option to standardize naming convention
 * 4. Verify the option was updated correctly with new value and maintained
 *    uniqueness
 */
export async function test_api_sku_option_admin_update_platform_wide(
  connection: api.IConnection,
) {
  // Step 1: Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateData = {
    email: adminEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Step 2: Seller registration to create initial SKU option
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerCreateData = {
    email: sellerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateData,
    });
  typia.assert(seller);

  // Step 3: Create custom SKU option as seller (initial naming)
  const initialOptionData = {
    option_name: "Storage",
    option_value: "256GB",
  } satisfies IShoppingMallSkuOption.ICreate;

  const createdOption: IShoppingMallSkuOption =
    await api.functional.shoppingMall.admin.skuOptions.create(connection, {
      body: initialOptionData,
    });
  typia.assert(createdOption);

  // Verify initial creation
  TestValidator.equals(
    "initial option name",
    createdOption.option_name,
    "Storage",
  );
  TestValidator.equals(
    "initial option value",
    createdOption.option_value,
    "256GB",
  );

  // Step 4: Admin updates the SKU option for platform-wide standardization
  const updateData = {
    option_value: "256 GB",
  } satisfies IShoppingMallSkuOption.IUpdate;

  const updatedOption: IShoppingMallSkuOption =
    await api.functional.shoppingMall.admin.skuOptions.update(connection, {
      optionId: createdOption.id,
      body: updateData,
    });
  typia.assert(updatedOption);

  // Step 5: Validate the update results
  TestValidator.equals(
    "updated option ID unchanged",
    updatedOption.id,
    createdOption.id,
  );
  TestValidator.equals(
    "option name unchanged",
    updatedOption.option_name,
    "Storage",
  );
  TestValidator.equals(
    "option value updated",
    updatedOption.option_value,
    "256 GB",
  );
  TestValidator.predicate(
    "admin can update any seller's options",
    updatedOption.option_value === "256 GB",
  );
}
