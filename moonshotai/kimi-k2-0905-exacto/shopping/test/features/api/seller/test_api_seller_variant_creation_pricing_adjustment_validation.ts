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

export async function test_api_seller_variant_creation_pricing_adjustment_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller account
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphaNumeric(10),
      phone: RandomGenerator.mobile(),
      business_type: "Limited Liability Company",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create base product with realistic pricing for adjustment testing
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `PRODUCT-${RandomGenerator.alphaNumeric(8)}`,
        name: "Premium T-Shirt",
        description: RandomGenerator.paragraph({ sentences: 5 }),
        price: 49.99,
        condition: "new",
        weight: 0.25,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: seller.id, // Note: In real scenario, would need actual category ID
        shopping_mall_seller_id: seller.id,
        href: `https://marketplace.example.com/products/${RandomGenerator.alphaNumeric(6)}`,
        referrer: `https://marketplace.example.com/`,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create product unit - Size for sizing variants
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

  // Step 4: Create product unit - Color for color variants
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

  // Step 5: Create PREMIUM variant with positive pricing adjustment (price premium)
  const premiumVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: `PREMIUM-${RandomGenerator.alphaNumeric(8)}`,
          title: "PREMIUM Large T-Shirt",
          price_adjustment: 15.0, // +$15 premium for large size
          cost_adjustment: 8.5, // Higher material cost
          weight_adjustment: 0.1, // Slightly heavier
          inventory_quantity: 25,
          inventory_policy: "deny", // No backorders
          position: 0, // Display first
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(premiumVariant);

  TestValidator.equals(
    "premium variant price adjustment",
    premiumVariant.price_adjustment,
    15.0,
  );
  TestValidator.equals(
    "premium variant cost adjustment",
    premiumVariant.cost_adjustment,
    8.5,
  );
  TestValidator.equals(
    "premium variant inventory policy",
    premiumVariant.inventory_policy,
    "deny",
  );
  TestValidator.equals(
    "premium variant display position",
    premiumVariant.position,
    0,
  );

  // Step 6: Create BUDGET variant with negative pricing adjustment (discount)
  const budgetVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: colorUnit.id,
          sku: `BUDGET-${RandomGenerator.alphaNumeric(8)}`,
          title: "BUDGET Basic Black",
          price_adjustment: -5.0, // -$5 discount for basic color
          cost_adjustment: -3.0, // Lower material cost
          inventory_quantity: 50,
          inventory_policy: "continue", // Allow backorders
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(budgetVariant);

  TestValidator.equals(
    "budget variant price adjustment",
    budgetVariant.price_adjustment,
    -5.0,
  );
  TestValidator.equals(
    "budget variant cost adjustment",
    budgetVariant.cost_adjustment,
    -3.0,
  );
  TestValidator.equals(
    "budget variant inventory policy",
    budgetVariant.inventory_policy,
    "continue",
  );

  // Step 7: Create STANDARD variant with zero pricing adjustment
  const standardVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: `STANDARD-${RandomGenerator.alphaNumeric(8)}`,
          title: "STANDARD Small White",
          price_adjustment: 0.0, // No price adjustment
          inventory_quantity: 30,
          inventory_policy: "deny",
          position: 2,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(standardVariant);

  TestValidator.equals(
    "standard variant price adjustment",
    standardVariant.price_adjustment,
    0.0,
  );
  TestValidator.equals(
    "standard variant has no cost adjustment",
    standardVariant.cost_adjustment,
    null,
  );
  TestValidator.equals(
    "standard variant has no weight adjustment",
    standardVariant.weight_adjustment,
    null,
  );

  // Step 8: Create COMPLEX variant with multiple pricing adjustments
  const complexVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: colorUnit.id,
          sku: `COMPLEX-${RandomGenerator.alphaNumeric(8)}`,
          title: "COMPLEX Limited Edition Red",
          price_adjustment: 25.0, // +$25 very premium
          cost_adjustment: 15.0, // High-end material cost
          weight_adjustment: 0.15, // Heavy premium fabric
          barcode: `LE-${RandomGenerator.alphabets(6).toUpperCase()}`,
          inventory_quantity: 10,
          inventory_policy: "deny",
          position: 3,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(complexVariant);

  TestValidator.equals(
    "complex variant price adjustment",
    complexVariant.price_adjustment,
    25.0,
  );
  TestValidator.equals(
    "complex variant cost adjustment",
    complexVariant.cost_adjustment,
    15.0,
  );
  TestValidator.equals(
    "complex variant weight adjustment",
    complexVariant.weight_adjustment,
    0.15,
  );
  TestValidator.equals(
    "complex variant has barcode",
    complexVariant.barcode !== null,
    true,
  );

  // Step 9: Validate final pricing calculations for all variants
  const basePrice = product.price;
  TestValidator.equals(
    "premium final price calculation",
    basePrice + premiumVariant.price_adjustment,
    64.99,
  );
  TestValidator.equals(
    "budget final price calculation",
    basePrice + budgetVariant.price_adjustment,
    44.99,
  );
  TestValidator.equals(
    "standard final price calculation",
    basePrice + standardVariant.price_adjustment,
    49.99,
  );
  TestValidator.equals(
    "complex final price calculation",
    basePrice + complexVariant.price_adjustment,
    74.99,
  );

  // Step 10: Test business validation - invalid inventory quantity
  await TestValidator.error(
    "variant creation with negative inventory should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productCode: product.sku,
          body: {
            shopping_mall_product_id: product.id,
            shopping_mall_product_unit_id: sizeUnit.id,
            sku: `INVALID-${RandomGenerator.alphaNumeric(8)}`,
            title: "Invalid Inventory Test",
            price_adjustment: 0.0,
            inventory_quantity: -1, // Invalid negative inventory
            inventory_policy: "deny",
            position: 4,
            is_active: true,
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
    },
  );
}
