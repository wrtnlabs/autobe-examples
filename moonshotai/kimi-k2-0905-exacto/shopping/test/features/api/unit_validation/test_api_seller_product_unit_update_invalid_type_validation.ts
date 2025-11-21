import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test validation of product unit type field with invalid classification
 * values.
 *
 * This test validates that the system rejects unsupported type classifications
 * while accepting valid categories including size, color, material, style, and
 * custom types. It ensures that invalid type values receive proper validation
 * with meaningful error messages guiding sellers toward correct configuration
 * options.
 */
export async function test_api_seller_product_unit_update_invalid_type_validation(
  connection: api.IConnection,
) {
  // Create seller account for authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: "Test Business " + RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Create product for unit testing
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: "PROD-" + RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name() + " Product",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        condition: "new",
        weight: 1.5,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: seller.id, // Using placeholder category for testing
        shopping_mall_seller_id: seller.id,
        href: "https://testshop.com/products",
        referrer: "https://testshop.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Create product unit with valid type for baseline testing
  const validUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Size",
        type: "size",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(validUnit);

  // Test 1: Update with invalid type classification (non-existent type)
  await TestValidator.error(
    "invalid unit type should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.units.update(
        connection,
        {
          productCode: product.sku,
          unitId: validUnit.id,
          body: {
            type: "invalid_type_123",
          } satisfies IShoppingMallProductUnit.IUpdate,
        },
      );
    },
  );

  // Test 2: Update with another invalid type
  await TestValidator.error(
    "another invalid unit type should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.units.update(
        connection,
        {
          productCode: product.sku,
          unitId: validUnit.id,
          body: {
            type: "fake_category",
          } satisfies IShoppingMallProductUnit.IUpdate,
        },
      );
    },
  );

  // Test 3: Verify valid type updates still work
  const validTypeUpdate =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: validUnit.id,
      body: {
        type: "color",
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(validTypeUpdate);

  TestValidator.equals(
    "valid type update should succeed",
    validTypeUpdate.type,
    "color",
  );

  // Test 4: Update valid type to another valid type
  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: validUnit.id,
      body: {
        type: "material",
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(materialUnit);

  TestValidator.equals(
    "material type update should succeed",
    materialUnit.type,
    "material",
  );

  // Test 5: Edge case - empty string (should be rejected)
  await TestValidator.error(
    "empty string unit type should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.units.update(
        connection,
        {
          productCode: product.sku,
          unitId: validUnit.id,
          body: {
            type: "",
          } satisfies IShoppingMallProductUnit.IUpdate,
        },
      );
    },
  );

  // Test 6: Edge case - special characters (should be rejected)
  await TestValidator.error(
    "special characters in unit type should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.units.update(
        connection,
        {
          productCode: product.sku,
          unitId: validUnit.id,
          body: {
            type: "@$%&*",
          } satisfies IShoppingMallProductUnit.IUpdate,
        },
      );
    },
  );

  // Test 7: Test custom type category (should be accepted)
  const customUnit =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: validUnit.id,
      body: {
        type: "custom",
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(customUnit);

  TestValidator.equals(
    "custom type update should succeed",
    customUnit.type,
    "custom",
  );

  // Test 8: Style type validation
  const styleUnit =
    await api.functional.shoppingMall.seller.products.units.update(connection, {
      productCode: product.sku,
      unitId: validUnit.id,
      body: {
        type: "style",
      } satisfies IShoppingMallProductUnit.IUpdate,
    });
  typia.assert(styleUnit);

  TestValidator.equals(
    "style type update should succeed",
    styleUnit.type,
    "style",
  );
}
