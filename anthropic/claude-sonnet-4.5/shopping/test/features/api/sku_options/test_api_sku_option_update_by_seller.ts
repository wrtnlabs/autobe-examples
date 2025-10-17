import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";

/**
 * Test seller's ability to update custom SKU option attributes for product
 * variants.
 *
 * This test validates the complete workflow where a seller creates and then
 * updates a custom SKU option to maintain consistency across their product
 * catalog. Custom SKU options allow sellers to define product-specific
 * attributes beyond standard color and size variants (e.g., storage capacity,
 * material composition).
 *
 * Workflow:
 *
 * 1. Seller registers and authenticates with complete business information
 * 2. Seller creates initial custom SKU option (e.g., "Storage Capacity: 128GB")
 * 3. Seller updates the option to refine naming (e.g., "128 GB" with proper
 *    spacing)
 * 4. Validate that update correctly modified the option_value field
 * 5. Verify the returned option contains all expected attributes
 */
export async function test_api_sku_option_update_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Register seller account with complete business information
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
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
        business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999>>} ${RandomGenerator.name(1)} St, ${RandomGenerator.name(1)} City`,
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  TestValidator.equals("seller email matches", seller.email, sellerEmail);

  // Step 2: Create initial custom SKU option
  const initialOptionName = "Storage Capacity";
  const initialOptionValue = "128GB";

  const createdOption: IShoppingMallSkuOption =
    await api.functional.shoppingMall.seller.skuOptions.create(connection, {
      body: {
        option_name: initialOptionName,
        option_value: initialOptionValue,
      } satisfies IShoppingMallSkuOption.ICreate,
    });
  typia.assert(createdOption);

  TestValidator.equals(
    "created option name matches",
    createdOption.option_name,
    initialOptionName,
  );
  TestValidator.equals(
    "created option value matches",
    createdOption.option_value,
    initialOptionValue,
  );

  // Step 3: Update the SKU option with refined value (add spacing)
  const updatedOptionValue = "128 GB";

  const updatedOption: IShoppingMallSkuOption =
    await api.functional.shoppingMall.seller.skuOptions.update(connection, {
      optionId: createdOption.id,
      body: {
        option_value: updatedOptionValue,
      } satisfies IShoppingMallSkuOption.IUpdate,
    });
  typia.assert(updatedOption);

  // Step 4: Validate the update was successful
  TestValidator.equals(
    "updated option ID unchanged",
    updatedOption.id,
    createdOption.id,
  );
  TestValidator.equals(
    "updated option name unchanged",
    updatedOption.option_name,
    initialOptionName,
  );
  TestValidator.equals(
    "updated option value matches new value",
    updatedOption.option_value,
    updatedOptionValue,
  );
  TestValidator.notEquals(
    "option value changed from initial",
    updatedOption.option_value,
    initialOptionValue,
  );
}
