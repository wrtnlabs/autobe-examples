import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";

/**
 * Test that validates the uniqueness constraint on SKU option combinations.
 *
 * This test ensures that the shopping_mall_sku_options table properly enforces
 * uniqueness on the combination of option_name and option_value fields. The
 * test creates an initial custom SKU option, then attempts to create a
 * duplicate with the same option_name and option_value combination, expecting
 * the second attempt to be rejected.
 *
 * Test workflow:
 *
 * 1. Register and authenticate as a seller
 * 2. Create the first custom SKU option with specific name and value
 * 3. Validate successful creation with proper UUID assignment
 * 4. Attempt to create duplicate SKU option with identical name and value
 * 5. Validate that duplicate creation fails with appropriate error
 *
 * This ensures data integrity and prevents confusion during product variant
 * configuration by maintaining unique option combinations across the platform.
 */
export async function test_api_sku_option_uniqueness_validation(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const sellerData = {
    email: sellerEmail,
    password: sellerPassword,
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerData });
  typia.assert(seller);

  // Step 2: Create the first custom SKU option
  const optionName = RandomGenerator.name(2);
  const optionValue = RandomGenerator.name(1);

  const firstOptionData = {
    option_name: optionName,
    option_value: optionValue,
  } satisfies IShoppingMallSkuOption.ICreate;

  const firstOption: IShoppingMallSkuOption =
    await api.functional.shoppingMall.seller.skuOptions.create(connection, {
      body: firstOptionData,
    });
  typia.assert(firstOption);

  // Step 3: Validate successful creation
  TestValidator.equals(
    "option name matches",
    firstOption.option_name,
    optionName,
  );
  TestValidator.equals(
    "option value matches",
    firstOption.option_value,
    optionValue,
  );

  // Step 4: Attempt to create duplicate SKU option with same name and value
  const duplicateOptionData = {
    option_name: optionName,
    option_value: optionValue,
  } satisfies IShoppingMallSkuOption.ICreate;

  await TestValidator.error(
    "duplicate option creation should fail",
    async () => {
      await api.functional.shoppingMall.seller.skuOptions.create(connection, {
        body: duplicateOptionData,
      });
    },
  );
}
