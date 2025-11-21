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

export async function test_api_seller_variant_creation_pricing_optimization(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for pricing optimization testing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
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
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create base product with pricing foundation
  const baseProduct = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `PROD-${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        price: 299.99,
        compare_at_price: 399.99,
        cost: 180.0,
        condition: "new",
        weight: 2.5,
        weight_unit: "kg",
        barcode: RandomGenerator.alphaNumeric(12),
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        seo_description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        tags: "electronics,gadgets,tech",
        featured_image: "https://example.com/product-image.jpg",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/seller/dashboard/products/create",
        referrer: "https://example.com/seller/dashboard/products",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(baseProduct);

  // Step 3: Create product unit configurations for pricing-based variant selection
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

  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: baseProduct.sku,
      body: {
        name: "Material",
        type: "material",
        display_style: "buttons",
        is_required: false,
        is_multiple: false,
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(materialUnit);

  // Step 4: Create premium size variant with positive price adjustment for enhanced features
  const premiumVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: baseProduct.sku,
        body: {
          shopping_mall_product_id: baseProduct.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: `${baseProduct.sku}-LG-PREMIUM`,
          title: "Large, Premium Size",
          price_adjustment: 50.0,
          cost_adjustment: 25.0,
          weight_adjustment: 0.5,
          barcode: RandomGenerator.alphaNumeric(12),
          image: "https://example.com/variant-premium-image.jpg",
          inventory_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          inventory_policy: "deny",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(premiumVariant);
  TestValidator.equals(
    "premium variant price adjustment",
    premiumVariant.price_adjustment,
    50.0,
  );
  TestValidator.equals(
    "premium variant cost adjustment",
    premiumVariant.cost_adjustment,
    25.0,
  );
  TestValidator.equals(
    "premium variant final price",
    baseProduct.price + premiumVariant.price_adjustment,
    349.99,
  );

  // Step 5: Create budget size variant with negative price adjustment for value positioning
  const budgetVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: baseProduct.sku,
        body: {
          shopping_mall_product_id: baseProduct.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: `${baseProduct.sku}-SM-BUDGET`,
          title: "Small, Budget Size",
          price_adjustment: -30.0,
          cost_adjustment: -15.0,
          weight_adjustment: -0.3,
          barcode: RandomGenerator.alphaNumeric(12),
          image: "https://example.com/variant-budget-image.jpg",
          inventory_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<20> & tags.Maximum<200>
          >(),
          inventory_policy: "continue",
          position: 2,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(budgetVariant);
  TestValidator.equals(
    "budget variant price adjustment",
    budgetVariant.price_adjustment,
    -30.0,
  );
  TestValidator.equals(
    "budget variant cost adjustment",
    budgetVariant.cost_adjustment,
    -15.0,
  );
  TestValidator.equals(
    "budget variant final price",
    baseProduct.price + budgetVariant.price_adjustment,
    269.99,
  );

  // Step 6: Create luxury color variant with significant premium pricing
  const luxuryVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: baseProduct.sku,
        body: {
          shopping_mall_product_id: baseProduct.id,
          shopping_mall_product_unit_id: colorUnit.id,
          sku: `${baseProduct.sku}-GLD-LUXURY`,
          title: "Gold, Luxury Edition",
          price_adjustment: 150.0,
          cost_adjustment: 75.0,
          weight_adjustment: 0.2,
          barcode: RandomGenerator.alphaNumeric(12),
          image: "https://example.com/variant-luxury-image.jpg",
          inventory_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<50>
          >(),
          inventory_policy: "deny",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(luxuryVariant);
  TestValidator.equals(
    "luxury variant price adjustment",
    luxuryVariant.price_adjustment,
    150.0,
  );
  TestValidator.equals(
    "luxury variant cost adjustment",
    luxuryVariant.cost_adjustment,
    75.0,
  );
  TestValidator.equals(
    "luxury variant final price",
    baseProduct.price + luxuryVariant.price_adjustment,
    449.99,
  );

  // Step 7: Create standard color variant with competitive pricing
  const standardVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: baseProduct.sku,
        body: {
          shopping_mall_product_id: baseProduct.id,
          shopping_mall_product_unit_id: colorUnit.id,
          sku: `${baseProduct.sku}-BLK-STANDARD`,
          title: "Black, Standard Edition",
          price_adjustment: 0.0,
          cost_adjustment: null,
          weight_adjustment: 0.0,
          barcode: RandomGenerator.alphaNumeric(12),
          image: "https://example.com/variant-standard-image.jpg",
          inventory_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<500>
          >(),
          inventory_policy: "continue",
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
    "standard variant cost adjustment",
    standardVariant.cost_adjustment,
    null,
  );
  TestValidator.equals(
    "standard variant final price",
    baseProduct.price + standardVariant.price_adjustment,
    299.99,
  );

  // Step 8: Create material variant with eco-friendly premium positioning
  const ecoFriendlyVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: baseProduct.sku,
        body: {
          shopping_mall_product_id: baseProduct.id,
          shopping_mall_product_unit_id: materialUnit.id,
          sku: `${baseProduct.sku}-ECO-SUSTAINABLE`,
          title: "Eco-Friendly, Sustainable Material",
          price_adjustment: 45.0,
          cost_adjustment: 20.0,
          weight_adjustment: -0.1,
          barcode: RandomGenerator.alphaNumeric(12),
          image: "https://example.com/variant-eco-image.jpg",
          inventory_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<15> & tags.Maximum<75>
          >(),
          inventory_policy: "deny",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(ecoFriendlyVariant);
  TestValidator.equals(
    "eco-friendly variant price adjustment",
    ecoFriendlyVariant.price_adjustment,
    45.0,
  );
  TestValidator.equals(
    "eco-friendly variant cost adjustment",
    ecoFriendlyVariant.cost_adjustment,
    20.0,
  );
  TestValidator.equals(
    "eco-friendly variant final price",
    baseProduct.price + ecoFriendlyVariant.price_adjustment,
    344.99,
  );

  // Step 9: Validate margin preservation across all pricing strategies
  const calculateMargin = (price: number, cost: number) =>
    ((price - cost) / price) * 100;

  const baseMargin = calculateMargin(baseProduct.price, baseProduct.cost ?? 0);
  const premiumMargin = calculateMargin(
    baseProduct.price + premiumVariant.price_adjustment,
    (baseProduct.cost ?? 0) + (premiumVariant.cost_adjustment ?? 0),
  );
  const budgetMargin = calculateMargin(
    baseProduct.price + budgetVariant.price_adjustment,
    (baseProduct.cost ?? 0) + (budgetVariant.cost_adjustment ?? 0),
  );
  const luxuryMargin = calculateMargin(
    baseProduct.price + luxuryVariant.price_adjustment,
    (baseProduct.cost ?? 0) + (luxuryVariant.cost_adjustment ?? 0),
  );
  const standardMargin = calculateMargin(
    baseProduct.price + standardVariant.price_adjustment,
    (baseProduct.cost ?? 0) + (standardVariant.cost_adjustment ?? 0),
  );
  const ecoFriendlyMargin = calculateMargin(
    baseProduct.price + ecoFriendlyVariant.price_adjustment,
    (baseProduct.cost ?? 0) + (ecoFriendlyVariant.cost_adjustment ?? 0),
  );

  TestValidator.predicate("base product margin is positive", baseMargin > 0);
  TestValidator.predicate(
    "premium variant maintains margin",
    premiumMargin >= baseMargin,
  );
  TestValidator.predicate(
    "budget variant maintains minimum margin",
    budgetMargin >= 15,
  );
  TestValidator.predicate(
    "luxury variant has highest margin",
    luxuryMargin > premiumMargin,
  );
  TestValidator.predicate(
    "standard variant maintains base margin",
    Math.abs(standardMargin - baseMargin) < 1,
  );
  TestValidator.predicate(
    "eco-friendly variant maintains premium margin",
    ecoFriendlyMargin >= premiumMargin,
  );

  // Step 10: Validate competitive positioning and customer value proposition
  const variants = [
    premiumVariant,
    budgetVariant,
    luxuryVariant,
    standardVariant,
    ecoFriendlyVariant,
  ];
  const pricePoints = variants
    .map((v) => baseProduct.price + v.price_adjustment)
    .sort((a, b) => a - b);

  TestValidator.predicate(
    "price differentiation strategy implemented",
    pricePoints.length === variants.length,
  );
  TestValidator.predicate(
    "budget variant is lowest price",
    pricePoints[0] === 269.99,
  );
  TestValidator.predicate(
    "luxury variant is highest price",
    pricePoints[pricePoints.length - 1] === 449.99,
  );
  TestValidator.predicate(
    "standard variant at base price",
    pricePoints.includes(299.99),
  );

  // Step 11: Validate inventory policies align with pricing strategies
  const highEndVariants = variants.filter((v) => v.price_adjustment > 30);
  const budgetVariants = variants.filter((v) => v.price_adjustment <= 0);

  TestValidator.predicate(
    "high-end variants use restrictive inventory policy",
    highEndVariants.every((v) => v.inventory_policy === "deny"),
  );
  TestValidator.predicate(
    "budget variants use flexible inventory policy",
    budgetVariants.every((v) => v.inventory_policy === "continue"),
  );
  TestValidator.predicate(
    "luxury variant has lowest inventory levels",
    luxuryVariant.inventory_quantity <= 50,
  );
  TestValidator.predicate(
    "budget variant has highest inventory levels",
    budgetVariant.inventory_quantity >= 100,
  );

  // Step 12: Validate competitive analysis data integrity
  TestValidator.equals(
    "all variants belong to same product",
    variants.every((v) => v.shopping_mall_product_id === baseProduct.id),
    true,
  );
  TestValidator.equals(
    "all variants have unique SKUs",
    variants.map((v) => v.sku).length ===
      new Set(variants.map((v) => v.sku)).size,
    true,
  );
  TestValidator.equals(
    "all variants have valid barcodes",
    variants.every((v) => v.barcode && v.barcode.length >= 10),
    true,
  );
  TestValidator.equals(
    "all variants have display positions",
    variants.every((v) => typeof v.position === "number" && v.position >= 0),
    true,
  );
  TestValidator.equals(
    "all variants have proper activation status",
    variants.every((v) => v.is_active === true),
    true,
  );
}
