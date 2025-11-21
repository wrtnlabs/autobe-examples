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
 * Test creation of premium product variants with enhanced pricing, superior
 * materials, advanced features, and luxury positioning strategies. Validates
 * that sellers can effectively differentiate product tiers through
 * variant-specific pricing, inventory policies, and customer targeting while
 * maintaining competitive marketplace positioning and profit optimization
 * across variant configurations.
 */
export async function test_api_seller_variant_creation_premium_configs(
  connection: api.IConnection,
) {
  // Step 1: Register seller account with comprehensive business information
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(3),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile("010"),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create base product suitable for premium variant differentiation
  const baseProduct = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `PREMIUM-${RandomGenerator.alphaNumeric(8)}`,
        name: "Luxury Premium Smartwatch Series",
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        price: 299.99,
        condition: "new",
        weight: 0.08,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: seller.id, // Using seller ID as valid UUID for category
        shopping_mall_seller_id: seller.id,
        seo_title: "Premium Luxury Smartwatch - Advanced Technology",
        seo_description: RandomGenerator.paragraph({ sentences: 6 }),
        tags: "luxury, premium, smartwatch, technology, fitness, health",
        featured_image: null,
        href: "https://marketplace.example.com/seller/products/create",
        referrer: "https://marketplace.example.com/seller/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(baseProduct);

  // Step 3: Create product units for premium variant differentiation
  // Size unit configuration
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

  // Material unit configuration
  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: baseProduct.sku,
      body: {
        name: "Material",
        type: "material",
        display_style: "buttons",
        is_required: true,
        is_multiple: false,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(materialUnit);

  // Features unit for luxury enhancements
  const featuresUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: baseProduct.sku,
      body: {
        name: "Premium Features",
        type: "style",
        display_style: "buttons",
        is_required: true,
        is_multiple: true,
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(featuresUnit);

  // Step 4: Create premium variants with different pricing strategies

  // Standard Premium Variant - Titanium Material
  const titaniumVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: baseProduct.sku,
        body: {
          shopping_mall_product_id: baseProduct.id,
          shopping_mall_product_unit_id: materialUnit.id,
          sku: `${baseProduct.sku}-TITANIUM`,
          title: "Premium - Titanium Build, Advanced Health Tracking",
          price_adjustment: 150.0, // +$150 for premium materials
          cost_adjustment: 85.0, // Higher material costs
          weight_adjustment: 0.02, // Slightly heavier titanium
          barcode: `PREM${RandomGenerator.alphaNumeric(10)}`,
          image: null,
          inventory_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<200>
          >(),
          inventory_policy: "deny",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(titaniumVariant);

  // Luxury Elite Variant - Platinum with Diamond Accent
  const platinumVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: baseProduct.sku,
        body: {
          shopping_mall_product_id: baseProduct.id,
          shopping_mall_product_unit_id: materialUnit.id,
          sku: `${baseProduct.sku}-PLATINUM`,
          title: "Elite - Platinum Edition, Diamond Accent, Concierge Service",
          price_adjustment: 450.0, // +$450 for luxury positioning
          cost_adjustment: 280.0, // Significantly higher luxury costs
          weight_adjustment: 0.05, // Premium materials add weight
          barcode: `LUX${RandomGenerator.alphaNumeric(10)}`,
          image: null,
          inventory_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<50>
          >(), // Limited luxury inventory
          inventory_policy: "deny",
          position: 0, // Highlight at top
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(platinumVariant);

  // Enhanced Features Variant - All Premium Add-ons
  const enhancedFeaturesVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: baseProduct.sku,
        body: {
          shopping_mall_product_id: baseProduct.id,
          shopping_mall_product_unit_id: featuresUnit.id,
          sku: `${baseProduct.sku}-ENHANCED`,
          title:
            "Enhanced - Full Feature Package, Lifetime Warranty, VIP Support",
          price_adjustment: 200.0, // +$200 for feature premium
          cost_adjustment: 120.0, // Higher support and warranty costs
          weight_adjustment: 0.01, // Minimal additional components weight
          barcode: `ENH${RandomGenerator.alphaNumeric(10)}`,
          image: null,
          inventory_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<25> & tags.Maximum<100>
          >(),
          inventory_policy: "deny",
          position: 2,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(enhancedFeaturesVariant);

  // Step 5: Validate premium variant creation and pricing strategy
  TestValidator.equals("seller verification status", seller.is_verified, true);
  TestValidator.equals("base product status", baseProduct.status, "active");
  TestValidator.equals(
    "base product price strategy",
    baseProduct.price,
    299.99,
  );

  // Validate variant-specific pricing and positioning
  TestValidator.equals(
    "titanium variant price adjustment",
    titaniumVariant.price_adjustment,
    150.0,
  );
  TestValidator.equals(
    "platinum variant luxury pricing",
    platinumVariant.price_adjustment,
    450.0,
  );
  TestValidator.equals(
    "enhanced features variant pricing",
    enhancedFeaturesVariant.price_adjustment,
    200.0,
  );

  // Validate inventory policies and availability
  TestValidator.predicate(
    "titanium inventory sufficient",
    titaniumVariant.inventory_quantity >= 50,
  );
  TestValidator.predicate(
    "platinum inventory limited",
    platinumVariant.inventory_quantity <= 50,
  );
  TestValidator.predicate(
    "enhanced inventory moderate",
    enhancedFeaturesVariant.inventory_quantity >= 25,
  );

  // Validate variant positioning strategy
  TestValidator.equals(
    "platinum positioned first",
    platinumVariant.position,
    0,
  );
  TestValidator.equals(
    "titanium positioned second",
    titaniumVariant.position,
    1,
  );
  TestValidator.equals(
    "enhanced positioned third",
    enhancedFeaturesVariant.position,
    2,
  );

  // Validate luxury marketplace positioning through pricing differentiation
  const totalPricePremium =
    titaniumVariant.price_adjustment +
    platinumVariant.price_adjustment +
    enhancedFeaturesVariant.price_adjustment;
  TestValidator.predicate(
    "combined premium positioning justified",
    totalPricePremium >= 700.0,
  );

  // Validate competitive marketplace differentiation
  TestValidator.predicate(
    "premium variants active",
    titaniumVariant.is_active &&
      platinumVariant.is_active &&
      enhancedFeaturesVariant.is_active,
  );
  TestValidator.equals(
    "platinum inventory denied",
    typia.assert(platinumVariant.inventory_policy!),
    "deny",
  );
  TestValidator.equals(
    "titanium inventory denied",
    typia.assert(titaniumVariant.inventory_policy!),
    "deny",
  );
}
