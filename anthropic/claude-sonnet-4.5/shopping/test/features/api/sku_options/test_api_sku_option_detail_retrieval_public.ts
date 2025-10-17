import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";

/**
 * Test SKU option detail retrieval workflow.
 *
 * Validates the complete process of creating and retrieving a custom SKU
 * option. This test ensures that custom options can be created by sellers and
 * then retrieved with complete details for use in product variant configuration
 * interfaces.
 *
 * Workflow:
 *
 * 1. Register a new seller account to obtain authentication
 * 2. Create a custom SKU option (e.g., "Storage Capacity: 256GB")
 * 3. Retrieve the option details using its unique ID
 * 4. Validate that all returned fields match the created option
 */
export async function test_api_sku_option_detail_retrieval_public(
  connection: api.IConnection,
) {
  // Step 1: Register new seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
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
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street, ${RandomGenerator.name(1)} City`,
    tax_id: RandomGenerator.alphaNumeric(9),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerData });
  typia.assert(seller);

  // Step 2: Create custom SKU option with seller authentication
  const optionData = {
    option_name: RandomGenerator.pick([
      "Storage Capacity",
      "Material Type",
      "Package Quantity",
      "Color Grade",
    ] as const),
    option_value: RandomGenerator.pick([
      "256GB",
      "512GB",
      "1TB",
      "Cotton",
      "Polyester",
      "Pack of 10",
      "Premium",
    ] as const),
  } satisfies IShoppingMallSkuOption.ICreate;

  const createdOption: IShoppingMallSkuOption =
    await api.functional.shoppingMall.seller.skuOptions.create(connection, {
      body: optionData,
    });
  typia.assert(createdOption);

  // Step 3: Retrieve the created option details using public endpoint
  const retrievedOption: IShoppingMallSkuOption =
    await api.functional.shoppingMall.skuOptions.at(connection, {
      optionId: createdOption.id,
    });
  typia.assert(retrievedOption);

  // Step 4: Validate retrieved option matches created option
  TestValidator.equals(
    "retrieved option ID matches created option",
    retrievedOption.id,
    createdOption.id,
  );

  TestValidator.equals(
    "retrieved option_name matches created option",
    retrievedOption.option_name,
    optionData.option_name,
  );

  TestValidator.equals(
    "retrieved option_value matches created option",
    retrievedOption.option_value,
    optionData.option_value,
  );
}
