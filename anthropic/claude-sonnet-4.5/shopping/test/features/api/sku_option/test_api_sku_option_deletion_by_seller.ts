import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";

/**
 * Test complete lifecycle of custom SKU option management by seller.
 *
 * This test validates the end-to-end workflow of custom SKU option management,
 * including seller registration, authentication, option creation, and
 * deletion.
 *
 * Workflow:
 *
 * 1. Create a new seller account with business information
 * 2. Authenticate automatically (tokens issued on registration)
 * 3. Create a custom SKU option (e.g., "Storage Capacity: 256GB")
 * 4. Validate the option was created successfully with unique UUID
 * 5. Delete the custom SKU option before any SKU references it
 * 6. Verify the hard delete removes the option permanently
 */
export async function test_api_sku_option_deletion_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create a new seller account with complete business information
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const sellerCreateData = {
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
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999>>()} ${RandomGenerator.name(1)} Street, ${RandomGenerator.name(1)} City`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  // Step 2: Register seller and receive authentication tokens automatically
  const authorizedSeller = await api.functional.auth.seller.join(connection, {
    body: sellerCreateData,
  });
  typia.assert(authorizedSeller);

  // Validate seller authentication response structure
  TestValidator.equals(
    "seller email matches registration",
    authorizedSeller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "business name matches registration",
    authorizedSeller.business_name,
    sellerCreateData.business_name,
  );

  // Step 3: Create a custom SKU option as the authenticated seller
  const optionNames = [
    "Storage Capacity",
    "Material Type",
    "Package Quantity",
    "Subscription Period",
  ] as const;
  const optionValues = {
    "Storage Capacity": ["128GB", "256GB", "512GB", "1TB"],
    "Material Type": ["Cotton", "Polyester", "Silk", "Wool"],
    "Package Quantity": ["6-pack", "12-pack", "24-pack", "48-pack"],
    "Subscription Period": ["Monthly", "Quarterly", "Annual", "Biennial"],
  } as const;

  const selectedOptionName = RandomGenerator.pick(optionNames);
  const selectedOptionValue = RandomGenerator.pick(
    optionValues[selectedOptionName],
  );

  const optionCreateData = {
    option_name: selectedOptionName,
    option_value: selectedOptionValue,
  } satisfies IShoppingMallSkuOption.ICreate;

  const createdOption =
    await api.functional.shoppingMall.seller.skuOptions.create(connection, {
      body: optionCreateData,
    });
  typia.assert(createdOption);

  // Step 4: Validate the created option has correct structure and values
  TestValidator.equals(
    "option name matches creation request",
    createdOption.option_name,
    selectedOptionName,
  );
  TestValidator.equals(
    "option value matches creation request",
    createdOption.option_value,
    selectedOptionValue,
  );

  // Step 5: Delete the custom SKU option (no SKU references exist yet)
  await api.functional.shoppingMall.seller.skuOptions.erase(connection, {
    optionId: createdOption.id,
  });

  // Step 6: Verify the option deletion succeeded (no error thrown)
  // The deletion is permanent and the option is no longer retrievable
  // Since there's no GET endpoint to verify deletion, successful completion
  // of the erase operation without exceptions confirms the deletion worked
}
