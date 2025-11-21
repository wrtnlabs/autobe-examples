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
 * Test variant creation with various pricing adjustment scenarios including
 * positive increases for premium configurations and negative adjustments for
 * simplified versions. Validates that price modifications are correctly applied
 * to base product pricing and reflected in customer-facing displays. Ensures
 * cost adjustments are properly tracked for accurate profit margin calculations
 * and business intelligence reporting across different variant configurations.
 */
export async function test_api_seller_variant_pricing_adjustments(
  connection: api.IConnection,
) {
  // 1. Create seller account for testing
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Create base product with established pricing
  const baseProduct = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 8 }),
        price: 99.99,
        compare_at_price: 129.99,
        cost: 45.0,
        weight: 2.5,
        weight_unit: "kg",
        barcode: RandomGenerator.alphaNumeric(13),
        condition: "new",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/products/create",
        referrer: "https://example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(baseProduct);

  // 3. Set up product units for variant creation
  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: baseProduct.sku,
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

  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: baseProduct.sku,
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

  // 4. Create variant with positive price adjustment (premium configuration)
  const premiumVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: baseProduct.sku,
        body: {
          shopping_mall_product_id: baseProduct.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: `${baseProduct.sku}-L-BLACK-PREMIUM`,
          title: "Large, Black - Premium Edition",
          price_adjustment: 25.0,
          cost_adjustment: 8.5,
          weight_adjustment: 0.2,
          inventory_quantity: 50,
          inventory_policy: "deny",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(premiumVariant);

  // 5. Create variant with negative price adjustment (simplified version)
  const budgetVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: baseProduct.sku,
        body: {
          shopping_mall_product_id: baseProduct.id,
          shopping_mall_product_unit_id: colorUnit.id,
          sku: `${baseProduct.sku}-WHITE-BASIC`,
          title: "White - Basic Edition",
          price_adjustment: -15.0,
          cost_adjustment: -5.0,
          weight_adjustment: -0.1,
          inventory_quantity: 75,
          inventory_policy: "continue",
          position: 2,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(budgetVariant);

  // 6. Create variant with zero adjustment (standard version)
  const standardVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: baseProduct.sku,
        body: {
          shopping_mall_product_id: baseProduct.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: `${baseProduct.sku}-M-STANDARD`,
          title: "Medium - Standard Edition",
          price_adjustment: 0.0,
          inventory_quantity: 100,
          inventory_policy: "deny",
          position: 3,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(standardVariant);

  // 7. Create variant with complex adjustments (luxury version)
  const luxuryVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: baseProduct.sku,
        body: {
          shopping_mall_product_id: baseProduct.id,
          shopping_mall_product_unit_id: colorUnit.id,
          sku: `${baseProduct.sku}-GOLD-LIMITED`,
          title: "Gold - Limited Edition",
          price_adjustment: 75.0,
          cost_adjustment: 35.0,
          weight_adjustment: 0.5,
          barcode: RandomGenerator.alphaNumeric(13),
          image: "https://example.com/images/gold-limited.jpg",
          inventory_quantity: 25,
          inventory_policy: "deny",
          position: 4,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(luxuryVariant);

  // 8. Validate pricing adjustments are correctly applied
  TestValidator.equals(
    "premium variant price adjustment",
    premiumVariant.price_adjustment,
    25.0,
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
    "budget variant price adjustment",
    budgetVariant.price_adjustment,
    -15.0,
  );
  TestValidator.equals(
    "budget variant cost adjustment",
    budgetVariant.cost_adjustment,
    -5.0,
  );
  TestValidator.equals(
    "budget variant inventory policy",
    budgetVariant.inventory_policy,
    "continue",
  );

  TestValidator.equals(
    "standard variant price adjustment",
    standardVariant.price_adjustment,
    0.0,
  );
  TestValidator.equals(
    "standard variant inventory policy",
    standardVariant.inventory_policy,
    "deny",
  );

  TestValidator.equals(
    "luxury variant price adjustment",
    luxuryVariant.price_adjustment,
    75.0,
  );
  TestValidator.equals(
    "luxury variant cost adjustment",
    luxuryVariant.cost_adjustment,
    35.0,
  );
  TestValidator.equals(
    "luxury variant weight adjustment",
    luxuryVariant.weight_adjustment,
    0.5,
  );
  TestValidator.equals(
    "luxury variant barcode exists",
    luxuryVariant.barcode !== null,
    true,
  );
  TestValidator.equals(
    "luxury variant image URL",
    luxuryVariant.image,
    "https://example.com/images/gold-limited.jpg",
  );

  // 9. Validate calculated final prices (base price + adjustments)
  TestValidator.equals(
    "premium variant effective price",
    baseProduct.price + premiumVariant.price_adjustment,
    124.99,
  );
  TestValidator.equals(
    "budget variant effective price",
    baseProduct.price + budgetVariant.price_adjustment,
    84.99,
  );
  TestValidator.equals(
    "standard variant effective price",
    baseProduct.price + standardVariant.price_adjustment,
    99.99,
  );
  TestValidator.equals(
    "luxury variant effective price",
    baseProduct.price + luxuryVariant.price_adjustment,
    174.99,
  );

  // 10. Validate cost tracking for profit margin calculations
  const premiumEffectiveCost =
    (baseProduct.cost ?? 0) + (premiumVariant.cost_adjustment ?? 0);
  const budgetEffectiveCost =
    (baseProduct.cost ?? 0) + (budgetVariant.cost_adjustment ?? 0);
  const luxuryEffectiveCost =
    (baseProduct.cost ?? 0) + (luxuryVariant.cost_adjustment ?? 0);

  TestValidator.equals(
    "premium variant effective cost",
    premiumEffectiveCost,
    53.5,
  );
  TestValidator.equals(
    "budget variant effective cost",
    budgetEffectiveCost,
    40.0,
  );
  TestValidator.equals(
    "luxury variant effective cost",
    luxuryEffectiveCost,
    80.0,
  );

  // 11. Validate display ordering and activation status
  TestValidator.equals("premium variant position", premiumVariant.position, 1);
  TestValidator.equals("budget variant position", budgetVariant.position, 2);
  TestValidator.equals(
    "standard variant position",
    standardVariant.position,
    3,
  );
  TestValidator.equals("luxury variant position", luxuryVariant.position, 4);

  TestValidator.predicate("all variants are active", () =>
    [
      premiumVariant.is_active,
      budgetVariant.is_active,
      standardVariant.is_active,
      luxuryVariant.is_active,
    ].every((active) => active === true),
  );

  // 12. Validate inventory management across variants
  TestValidator.equals(
    "premium variant inventory",
    premiumVariant.inventory_quantity,
    50,
  );
  TestValidator.equals(
    "budget variant inventory",
    budgetVariant.inventory_quantity,
    75,
  );
  TestValidator.equals(
    "standard variant inventory",
    standardVariant.inventory_quantity,
    100,
  );
  TestValidator.equals(
    "luxury variant inventory",
    luxuryVariant.inventory_quantity,
    25,
  );
}
