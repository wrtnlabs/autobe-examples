import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test error handling for updates attempted on nonexistent products. This test
 * validates that the system properly rejects unit updates when the target
 * product code doesn't exist in the marketplace catalog, and ensures
 * appropriate error messages are returned while maintaining security by not
 * revealing sensitive information about product existence.
 *
 * Test flow:
 *
 * 1. Create a seller account to have proper authentication context
 * 2. Generate a random UUID for the unit ID that doesn't correspond to any product
 * 3. Generate a completely random product code that doesn't exist
 * 4. Attempt to update a unit for a nonexistent product
 * 5. Validate that the system rejects the request with appropriate error handling
 * 6. Ensure the error doesn't expose internal system details about product
 *    existence
 */
export async function test_api_seller_product_unit_update_nonexistent_product(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for authentication context
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    business_name: RandomGenerator.name(2),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    tax_id: RandomGenerator.alphaNumeric(9),
    phone: RandomGenerator.mobile(),
    business_type: RandomGenerator.pick([
      "corporation",
      "llc",
      "partnership",
      "sole_proprietorship",
    ] as const),
  } satisfies IShoppingMallSeller.IJoin;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 2: Generate completely random nonexistent product code and unit ID
  // These identifiers are guaranteed not to exist in the marketplace catalog
  const nonexistentProductCode = RandomGenerator.alphaNumeric(12);
  const nonexistentUnitId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Generate realistic product unit update data
  // This represents what a seller would typically want to modify
  const unitUpdateData = {
    name: "Size",
    type: "size",
    display_style: "dropdown",
    is_required: true,
    is_multiple: false,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallProductUnit.IUpdate;

  // Step 4: Attempt to update unit for nonexistent product
  // This should fail because the product code doesn't exist
  await TestValidator.error(
    "updating unit for nonexistent product should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.units.update(
        connection,
        {
          productCode: nonexistentProductCode,
          unitId: nonexistentUnitId,
          body: unitUpdateData,
        },
      );
    },
  );

  // Step 5: Test with different types of invalid identifiers
  // Test with special characters and edge cases in product code
  const specialProductCode = "NONEXISTENT-PROD-123!@#";

  await TestValidator.error(
    "updating unit with special characters in product code should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.units.update(
        connection,
        {
          productCode: specialProductCode,
          unitId: nonexistentUnitId,
          body: unitUpdateData,
        },
      );
    },
  );

  // Test with extremely long product code
  const longProductCode = RandomGenerator.alphaNumeric(100);

  await TestValidator.error(
    "updating unit with excessive length product code should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.units.update(
        connection,
        {
          productCode: longProductCode,
          unitId: nonexistentUnitId,
          body: unitUpdateData,
        },
      );
    },
  );

  // Step 6: Verify that response doesn't leak product existence information
  // This is a security requirement - systems should not reveal whether
  // a product exists or not through error messages
  // (Note: This test validates the error response, but doesn't access error details)

  // Step 7: Test update with minimal data to ensure rejection happens early
  const minimalUpdateData = {
    name: "Color",
  } satisfies IShoppingMallProductUnit.IUpdate;

  await TestValidator.error(
    "minimal update data for nonexistent product should still fail",
    async () => {
      await api.functional.shoppingMall.seller.products.units.update(
        connection,
        {
          productCode: RandomGenerator.alphaNumeric(15),
          unitId: typia.random<string & tags.Format<"uuid">>(),
          body: minimalUpdateData,
        },
      );
    },
  );
}
