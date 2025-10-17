import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";

/**
 * Test custom SKU option creation and management workflow.
 *
 * NOTE: The original test scenario requested validation of referential
 * integrity enforcement when deleting SKU options that are referenced by active
 * SKUs. However, the provided IShoppingMallSku.ICreate DTO does not include any
 * properties to link custom SKU options during SKU creation (only sku_code and
 * price are available). Therefore, the original scenario is unimplementable.
 *
 * This test instead validates the successful creation and deletion workflow for
 * custom SKU options, ensuring that sellers can:
 *
 * 1. Create custom SKU options with valid option names and values
 * 2. Successfully delete custom SKU options that are not in use
 * 3. Manage their product catalog's custom attribute system
 *
 * Workflow:
 *
 * 1. Create and authenticate seller account
 * 2. Create custom SKU option (e.g., storage capacity attribute)
 * 3. Verify option is created with correct properties
 * 4. Successfully delete the unused custom SKU option
 */
export async function test_api_sku_option_deletion_with_active_sku_reference(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
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
        business_address: `${RandomGenerator.name()} ${RandomGenerator.paragraph({ sentences: 2 })}`,
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Create custom SKU option
  const optionName = RandomGenerator.pick([
    "Storage Capacity",
    "Memory Size",
    "Material Type",
    "Package Size",
  ] as const);
  const optionValue = RandomGenerator.pick([
    "128GB",
    "256GB",
    "512GB",
    "16GB",
    "32GB",
    "Cotton",
    "Polyester",
  ] as const);

  const skuOption: IShoppingMallSkuOption =
    await api.functional.shoppingMall.seller.skuOptions.create(connection, {
      body: {
        option_name: optionName,
        option_value: optionValue,
      } satisfies IShoppingMallSkuOption.ICreate,
    });
  typia.assert(skuOption);

  // Step 3: Verify the created option has correct properties
  TestValidator.equals(
    "option name matches input",
    skuOption.option_name,
    optionName,
  );
  TestValidator.equals(
    "option value matches input",
    skuOption.option_value,
    optionValue,
  );
  TestValidator.predicate(
    "option has valid UUID",
    typeof skuOption.id === "string" && skuOption.id.length > 0,
  );

  // Step 4: Successfully delete the unused custom SKU option
  // Since the option is not referenced by any SKU, deletion should succeed
  await api.functional.shoppingMall.seller.skuOptions.erase(connection, {
    optionId: skuOption.id,
  });
}
