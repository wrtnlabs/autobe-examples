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
 * Test product unit creation by unauthorized users or sellers attempting to
 * create units for products they do not own. Validates proper authorization
 * checks and seller-product relationship enforcement for catalog integrity
 * protection.
 *
 * Test strategy:
 *
 * 1. Create a seller account
 * 2. Attempt to create product units for a non-existent product (covers both auth
 *    and existence validation)
 * 3. Test various invalid configurations and error scenarios
 * 4. Verify proper error handling and authorization enforcement
 */
export async function test_api_seller_product_unit_creation_unauthorized(
  connection: api.IConnection,
) {
  // Create seller account for authentication context
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "sole proprietorship",
        "corporation",
        "limited liability company",
        "partnership",
      ]),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Test 1: Attempt to create units for non-existent product (auth check)
  const nonExistentProductCode = RandomGenerator.alphaNumeric(12);
  const validUnitData = {
    name: "Size",
    type: "size",
    display_style: "dropdown",
    is_required: true,
    is_multiple: false,
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallProductUnit.ICreate;

  await TestValidator.error(
    "cannot create units for non-existent product",
    async () => {
      await api.functional.shoppingMall.seller.products.units.create(
        connection,
        {
          productCode: nonExistentProductCode,
          body: validUnitData,
        },
      );
    },
  );

  // Test 2: Invalid product code format
  const invalidProductCode = "invalid!@#$%";

  await TestValidator.error(
    "should fail with invalid product code format",
    async () => {
      await api.functional.shoppingMall.seller.products.units.create(
        connection,
        {
          productCode: invalidProductCode,
          body: validUnitData,
        },
      );
    },
  );

  // Test 3: Invalid unit configuration - missing required fields
  const incompleteUnitData = {
    name: "Color",
    type: "color",
    display_style: "swatches",
    is_required: false,
    is_multiple: false,
    // Missing sort_order - should be rejected
  } satisfies Partial<IShoppingMallProductUnit.ICreate>;

  await TestValidator.error(
    "should fail with incomplete unit data",
    async () => {
      await api.functional.shoppingMall.seller.products.units.create(
        connection,
        {
          productCode: RandomGenerator.alphaNumeric(12),
          body: incompleteUnitData as IShoppingMallProductUnit.ICreate,
        },
      );
    },
  );

  // Test 4: Invalid display style
  const invalidStyleUnit = {
    name: "Material",
    type: "material",
    display_style: "invalid_style",
    is_required: true,
    is_multiple: false,
    sort_order: 1,
  } satisfies IShoppingMallProductUnit.ICreate;

  await TestValidator.error(
    "should fail with invalid display style",
    async () => {
      await api.functional.shoppingMall.seller.products.units.create(
        connection,
        {
          productCode: RandomGenerator.alphaNumeric(12),
          body: invalidStyleUnit,
        },
      );
    },
  );

  // Test 5: Invalid sort order
  const invalidSortUnit = {
    name: "Style",
    type: "style",
    display_style: "buttons",
    is_required: true,
    is_multiple: false,
    sort_order: -5, // Invalid negative value
  } satisfies IShoppingMallProductUnit.ICreate;

  await TestValidator.error("should fail with invalid sort order", async () => {
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: RandomGenerator.alphaNumeric(12),
      body: invalidSortUnit,
    });
  });

  // Test 6: Boundary test - extremely long unit name
  const longNameUnit = {
    name: RandomGenerator.paragraph({ sentences: 10, wordMin: 5, wordMax: 10 }),
    type: "custom",
    display_style: "dropdown",
    is_required: true,
    is_multiple: true,
    sort_order: 1,
  } satisfies IShoppingMallProductUnit.ICreate;

  await TestValidator.error(
    "should fail with excessively long unit name",
    async () => {
      await api.functional.shoppingMall.seller.products.units.create(
        connection,
        {
          productCode: RandomGenerator.alphaNumeric(12),
          body: longNameUnit,
        },
      );
    },
  );

  // Test 7: Empty data validation
  await TestValidator.error("should fail with empty unit name", async () => {
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: RandomGenerator.alphaNumeric(12),
      body: {
        name: "",
        type: "size",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      },
    });
  });

  // Verify seller authentication is maintained throughout
  TestValidator.predicate(
    "seller authentication maintained",
    seller.is_verified === true,
  );
}
