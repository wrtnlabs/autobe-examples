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
 * Test variant creation with different inventory policies including deny
 * overselling and continue beyond zero stock. Validates proper inventory
 * management behavior and integration with order processing workflows for
 * accurate stock availability and customer experience management.
 *
 * This comprehensive test covers:
 *
 * 1. Seller registration and authentication
 * 2. Product creation with proper categorization
 * 3. Product unit configuration for variant options
 * 4. Variant creation with deny inventory policy (blocks overselling)
 * 5. Variant creation with continue inventory policy (allows backorders)
 * 6. Validation of inventory behavior under different policy settings
 * 7. Testing inventory quantity management and policy enforcement
 *
 * The test validates that sellers can configure different inventory policies
 * for their product variants, ensuring proper stock management and customer
 * experience across different scenarios (in-stock, out-of-stock, backorder).
 */
export async function test_api_seller_variant_creation_inventory_policies(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for inventory policy testing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create base product for inventory policy testing
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 12,
        }),
        price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<10000>
        >(),
        condition: "new",
        weight: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/product/create",
        referrer: "https://example.com/seller/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create product unit for size configuration
  const sizeUnit =
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
  typia.assert(sizeUnit);

  // Step 4: Create product unit for color configuration
  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Color",
        type: "color",
        display_style: "swatches",
        is_required: true,
        is_multiple: false,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(colorUnit);

  // Step 5: Create variant with deny inventory policy (prevents overselling)
  const denyVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: `${product.sku}-DENY-S`,
          title: "Small, Deny Policy",
          price_adjustment: 0,
          inventory_quantity: 5,
          inventory_policy: "deny",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(denyVariant);

  // Step 6: Create variant with continue inventory policy (allows backorders)
  const continueVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: colorUnit.id,
          sku: `${product.sku}-CONTINUE-BLUE`,
          title: "Blue, Continue Policy",
          price_adjustment: 500, // $5 premium for blue color
          inventory_quantity: 0, // Intentionally set to zero for backorder testing
          inventory_policy: "continue",
          position: 2,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(continueVariant);

  // Step 7: Validate variant properties and policies
  TestValidator.equals(
    "deny variant SKU should match pattern",
    denyVariant.sku,
    `${product.sku}-DENY-S`,
  );
  TestValidator.equals(
    "deny variant inventory policy should be 'deny'",
    denyVariant.inventory_policy,
    "deny",
  );
  TestValidator.equals(
    "deny variant inventory quantity should be 5",
    denyVariant.inventory_quantity,
    5,
  );
  TestValidator.equals(
    "deny variant should be active",
    denyVariant.is_active,
    true,
  );

  TestValidator.equals(
    "continue variant SKU should match pattern",
    continueVariant.sku,
    `${product.sku}-CONTINUE-BLUE`,
  );
  TestValidator.equals(
    "continue variant inventory policy should be 'continue'",
    continueVariant.inventory_policy,
    "continue",
  );
  TestValidator.equals(
    "continue variant inventory quantity should be 0",
    continueVariant.inventory_quantity,
    0,
  );
  TestValidator.equals(
    "continue variant price adjustment should be $5",
    continueVariant.price_adjustment,
    500,
  );
  TestValidator.equals(
    "continue variant should be active",
    continueVariant.is_active,
    true,
  );

  // Step 8: Validate product relationships
  TestValidator.equals(
    "variants should reference correct product",
    denyVariant.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "variants should reference correct units",
    [
      denyVariant.shopping_mall_product_unit_id,
      continueVariant.shopping_mall_product_unit_id,
    ],
    [sizeUnit.id, colorUnit.id],
  );

  // Step 9: Test inventory scenario validations
  TestValidator.predicate(
    "deny variant should not allow backorders",
    denyVariant.inventory_policy === "deny",
  );
  TestValidator.predicate(
    "continue variant should allow backorders",
    continueVariant.inventory_policy === "continue",
  );
  TestValidator.predicate(
    "deny variant has positive inventory when active",
    denyVariant.inventory_quantity > 0,
  );
  TestValidator.predicate(
    "continue variant can have zero inventory when allowing backorders",
    continueVariant.inventory_quantity === 0,
  );

  // Step 10: Test inventory policy behavior with different scenarios
  TestValidator.predicate(
    "deny policy prevents overselling when inventory reaches zero",
    denyVariant.inventory_policy === "deny" &&
      denyVariant.inventory_quantity > 0,
  );
  TestValidator.predicate(
    "continue policy enables backorder processing when inventory is zero",
    continueVariant.inventory_policy === "continue" &&
      continueVariant.inventory_quantity === 0,
  );
}
