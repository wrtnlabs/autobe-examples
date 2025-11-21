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
 * Test variant creation with sophisticated price adjustment strategies
 * including premium material upcharges, size-based pricing differentiation, and
 * feature package variations.
 *
 * This comprehensive test validates:
 *
 * - Seller registration and authentication setup
 * - Base product creation with pricing structure
 * - Product unit configuration for material, size, and feature variations
 * - Variant creation demonstrating multiple pricing strategies:
 *
 *   - Premium material upcharges with positive price adjustments
 *   - Size-based pricing differentiation (larger = more expensive)
 *   - Feature package variations with progressive pricing tiers
 * - Inventory management and policy settings across variants
 * - SKU uniqueness and variant positioning
 */
export async function test_api_seller_product_variant_price_strategy(
  connection: api.IConnection,
) {
  // Step 1: Seller Registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: "Premium Product Suppliers Co.",
      business_registration_number:
        RandomGenerator.alphaNumeric(10).toUpperCase(),
      tax_id: RandomGenerator.alphaNumeric(9).toUpperCase(),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "corporation",
        "LLC",
        "sole proprietorship",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Parent Product Creation
  const baseProduct = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphaNumeric(12).toUpperCase(),
        name: "Premium Laptop Backpack",
        description:
          "Professional-grade laptop backpack with premium materials and smart organization",
        price: 14999, // $149.99 base price
        compare_at_price: 19999, // $199.99 MSRP (25% discount)
        cost: 8999, // $89.99 cost for 40% margin
        condition: "new",
        weight: 1.2, // 1.2 kg base weight
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        seo_title: "Premium Laptop Backpack - Professional Travel Solution",
        seo_description:
          "Comfortable, durable laptop backpack designed for business professionals with premium materials",
        href: "https://premium-suppliers.com/products/laptop-backpack",
        referrer: "https://premium-suppliers.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(baseProduct);

  // Step 3: Product Units Setup - Material Unit
  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: baseProduct.sku,
      body: {
        name: "Material",
        type: "material",
        display_style: "buttons",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(materialUnit);

  // Product Units Setup - Size Unit
  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: baseProduct.sku,
      body: {
        name: "Size",
        type: "size",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(sizeUnit);

  // Product Units Setup - Features Unit
  const featuresUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: baseProduct.sku,
      body: {
        name: "Features",
        type: "custom",
        display_style: "dropdown",
        is_required: false,
        is_multiple: false,
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(featuresUnit);

  // Step 4: Variant Creation with Premium Material Strategy
  const premiumMaterialVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: baseProduct.sku,
        body: {
          shopping_mall_product_id: baseProduct.id,
          shopping_mall_product_unit_id: materialUnit.id,
          sku: `${baseProduct.sku}-PM`,
          title: "Premium Material, Nylon",
          price_adjustment: 2000, // +$20.00 for premium nylon (13% price increase)
          cost_adjustment: 1200, // +$12.00 to maintain cost structure
          weight_adjustment: 0, // Same weight
          inventory_quantity: 50,
          inventory_policy: "deny",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(premiumMaterialVariant);

  // Step 5: Variant Creation with Size-Based Pricing
  const largeSizeVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: baseProduct.sku,
        body: {
          shopping_mall_product_id: baseProduct.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: `${baseProduct.sku}-LG`,
          title: 'Large Size, Fits 17" Laptops',
          price_adjustment: 1500, // +$15.00 for larger capacity
          cost_adjustment: 800, // +$8.00 cost increase
          weight_adjustment: 200, // +200g extra material
          inventory_quantity: 25,
          inventory_policy: "deny",
          position: 2,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(largeSizeVariant);

  // Step 6: Variant Creation with Feature Package Variations
  const deluxeFeaturesVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: baseProduct.sku,
        body: {
          shopping_mall_product_id: baseProduct.id,
          shopping_mall_product_unit_id: featuresUnit.id,
          sku: `${baseProduct.sku}-DLX`,
          title: "Deluxe Features, USB Charging Port + Power Bank",
          price_adjustment: 2500, // +$25.00 for premium features
          cost_adjustment: 1000, // +$10.00 for USB port and power bank
          weight_adjustment: 100, // +100g for electronics
          inventory_quantity: 30,
          inventory_policy: "deny",
          position: 3,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(deluxeFeaturesVariant);

  // Step 7: Test Backorder-Enabled Variant
  const limitedEditionsVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: baseProduct.sku,
        body: {
          shopping_mall_product_id: baseProduct.id,
          shopping_mall_product_unit_id: materialUnit.id,
          sku: `${baseProduct.sku}-LE`,
          title: "Limited Edition, Carbon Fiber",
          price_adjustment: 5000, // +$50.00 premium for limited edition
          cost_adjustment: 2500, // +$25.00 increased cost
          inventory_quantity: 5, // Very limited stock
          inventory_policy: "continue", // Allow backorders
          position: 4,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(limitedEditionsVariant);

  // Step 8: Pricing Strategy Validation
  TestValidator.equals(
    "premium variant price should increase significantly",
    premiumMaterialVariant.price_adjustment,
    2000,
  );
  TestValidator.equals(
    "premium variant includes cost adjustment",
    premiumMaterialVariant.cost_adjustment,
    1200,
  );
  TestValidator.equals(
    "large size variant has moderate price increase",
    largeSizeVariant.price_adjustment,
    1500,
  );
  TestValidator.equals(
    "deluxe features variant has substantial price increase",
    deluxeFeaturesVariant.price_adjustment,
    2500,
  );
  TestValidator.equals(
    "limited edition variant has highest price premium",
    limitedEditionsVariant.price_adjustment,
    5000,
  );

  // Step 9: Inventory Management Testing
  TestValidator.equals(
    "premium material variant uses deny policy",
    premiumMaterialVariant.inventory_policy,
    "deny",
  );
  TestValidator.equals(
    "large size variant uses deny policy",
    largeSizeVariant.inventory_policy,
    "deny",
  );
  TestValidator.equals(
    "deluxe features variant uses deny policy",
    deluxeFeaturesVariant.inventory_policy,
    "deny",
  );
  TestValidator.equals(
    "limited edition uses continue policy",
    limitedEditionsVariant.inventory_policy,
    "continue",
  );

  // Step 10: SKU Uniqueness Validation
  TestValidator.notEquals(
    "premium SKU differs from base",
    premiumMaterialVariant.sku,
    baseProduct.sku,
  );
  TestValidator.notEquals(
    "large SKU differs from premium",
    largeSizeVariant.sku,
    premiumMaterialVariant.sku,
  );
  TestValidator.notEquals(
    "deluxe SKU differs from large",
    deluxeFeaturesVariant.sku,
    largeSizeVariant.sku,
  );
  TestValidator.notEquals(
    "limited SKU differs from deluxe",
    limitedEditionsVariant.sku,
    deluxeFeaturesVariant.sku,
  );

  // Step 11: Position Hierarchy Validation
  TestValidator.predicate(
    "position ordering ensures proper display hierarchy",
    () => {
      return (
        premiumMaterialVariant.position < largeSizeVariant.position &&
        largeSizeVariant.position < deluxeFeaturesVariant.position &&
        deluxeFeaturesVariant.position < limitedEditionsVariant.position
      );
    },
  );

  // Step 12: Weight-Based Pricing Correlation
  TestValidator.predicate(
    "weight adjustments correlate with pricing tiers",
    () => {
      return (
        largeSizeVariant.weight_adjustment === 200 &&
        deluxeFeaturesVariant.weight_adjustment === 100 &&
        limitedEditionsVariant.weight_adjustment === 0
      );
    },
  );

  // Step 13: Inventory Quantity Testing
  TestValidator.predicate(
    "inventory levels reflect product positioning",
    () => {
      return (
        premiumMaterialVariant.inventory_quantity === 50 &&
        largeSizeVariant.inventory_quantity === 25 &&
        deluxeFeaturesVariant.inventory_quantity === 30 &&
        limitedEditionsVariant.inventory_quantity === 5
      );
    },
  );
}
