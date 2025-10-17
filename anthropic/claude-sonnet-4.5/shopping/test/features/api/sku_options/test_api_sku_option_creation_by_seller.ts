import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";

/**
 * Test seller SKU option creation workflow.
 *
 * This test validates that sellers can successfully create custom SKU options
 * for their product variants. The workflow includes:
 *
 * 1. Seller registration and authentication
 * 2. Creating a custom SKU option with unique option_name and option_value
 * 3. Validating the created option structure and data integrity
 *
 * The test ensures that:
 *
 * - Seller authentication is properly established
 * - SKU options are created with valid UUIDs
 * - The option_name and option_value are correctly stored
 * - Response data matches the expected DTO structure
 */
export async function test_api_sku_option_creation_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a seller
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${RandomGenerator.alphaNumeric(4)} ${RandomGenerator.name(1)} Street, ${RandomGenerator.name(1)} City`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Verify seller authentication response structure
  TestValidator.equals("seller email matches", seller.email, sellerData.email);
  TestValidator.equals(
    "seller business name matches",
    seller.business_name,
    sellerData.business_name,
  );

  // Step 2: Create a custom SKU option
  const optionNames = [
    "Storage Capacity",
    "Material Type",
    "Package Quantity",
    "Subscription Duration",
    "Color Variant",
  ] as const;
  const optionValues = {
    "Storage Capacity": ["64GB", "128GB", "256GB", "512GB", "1TB"],
    "Material Type": ["Cotton", "Polyester", "Leather", "Wool", "Silk"],
    "Package Quantity": ["Single", "Pack of 3", "Pack of 6", "Pack of 12"],
    "Subscription Duration": ["Monthly", "Quarterly", "Yearly", "Lifetime"],
    "Color Variant": [
      "Matte Black",
      "Glossy White",
      "Metallic Silver",
      "Rose Gold",
    ],
  };

  const selectedOptionName = RandomGenerator.pick(optionNames);
  const selectedOptionValue = RandomGenerator.pick(
    optionValues[selectedOptionName],
  );

  const skuOptionData = {
    option_name: selectedOptionName,
    option_value: selectedOptionValue,
  } satisfies IShoppingMallSkuOption.ICreate;

  const createdOption =
    await api.functional.shoppingMall.seller.skuOptions.create(connection, {
      body: skuOptionData,
    });
  typia.assert(createdOption);

  // Step 3: Validate the created SKU option
  TestValidator.equals(
    "option name matches",
    createdOption.option_name,
    skuOptionData.option_name,
  );
  TestValidator.equals(
    "option value matches",
    createdOption.option_value,
    skuOptionData.option_value,
  );
}
