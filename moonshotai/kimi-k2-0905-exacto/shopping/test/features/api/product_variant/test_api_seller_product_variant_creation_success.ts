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
 * Test successful product variant creation for existing products enabling size,
 * color, or configuration differences with unique SKU assignment. Validates
 * variant creation workflow including unit selection, pricing adjustments,
 * inventory allocation, and customer-visible configuration options for enhanced
 * shopping experiences.
 *
 * This test implements a complete seller workflow for creating product
 * variants:
 *
 * 1. Authenticates as a seller
 * 2. Creates a base product (T-shirt) with comprehensive details
 * 3. Defines product units for size and color variations
 * 4. Creates multiple variants with different size/color combinations
 * 5. Validates variant properties, pricing, inventory, and SKU uniqueness
 * 6. Tests customer configuration options and display preferences
 */
export async function test_api_seller_product_variant_creation_success(
  connection: api.IConnection,
) {
  // Step 1: Create seller account with authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile("010"),
      business_type: RandomGenerator.pick([
        "corporation",
        "partnership",
        "sole_proprietorship",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create base product for variant testing
  const baseProduct = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `PROD-${RandomGenerator.alphaNumeric(8)}`,
        name: "Premium Cotton T-Shirt",
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        price: 29900,
        condition: "new",
        weight: 0.25,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        variants: [], // Start with empty variants
        images: [
          {
            name: "main-product-image",
            extension: "jpg",
            url: "https://example.com/products/main-image.jpg",
          } satisfies IShoppingMallProductImage.ICreate,
        ],
        href: "https://seller-dashboard.example.com/products/create",
        referrer: "https://seller-dashboard.example.com/products",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(baseProduct);

  // Step 3: Create size unit configuration
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

  // Step 4: Create color unit configuration
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

  // Step 5: Create size variant (Large)
  const largeVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: baseProduct.sku,
        body: {
          shopping_mall_product_id: baseProduct.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: `SIZE-${baseProduct.sku}-LARGE`,
          title: "Large Size",
          price_adjustment: 0,
          inventory_quantity: 50,
          inventory_policy: "deny",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(largeVariant);

  // Step 6: Create color variant (Navy Blue)
  const navyVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: baseProduct.sku,
        body: {
          shopping_mall_product_id: baseProduct.id,
          shopping_mall_product_unit_id: colorUnit.id,
          sku: `COLOR-${baseProduct.sku}-NAVY`,
          title: "Navy Blue",
          price_adjustment: 2000, // +2000 for premium color
          cost_adjustment: 1500,
          weight_adjustment: 0.02,
          image: "https://example.com/products/navy-blue-variant.jpg",
          inventory_quantity: 30,
          inventory_policy: "deny",
          position: 2,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(navyVariant);

  // Step 7: Create premium variant combination (Extra Large + Premium Color)
  const premiumVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: baseProduct.sku,
        body: {
          shopping_mall_product_id: baseProduct.id,
          shopping_mall_product_unit_id: colorUnit.id,
          sku: `PREMIUM-${baseProduct.sku}-XL-RED`,
          title: "Extra Large, Premium Red",
          price_adjustment: 5000, // +5000 for premium combination
          cost_adjustment: 3500,
          weight_adjustment: 0.03,
          image: "https://example.com/products/premium-red-xl.jpg",
          inventory_quantity: 20,
          inventory_policy: "continue", // Allow backorder for premium variant
          position: 3,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(premiumVariant);

  // Step 8: Test variant business validations
  TestValidator.equals(
    "Large variant SKU matches format",
    largeVariant.sku,
    `SIZE-${baseProduct.sku}-LARGE`,
  );
  TestValidator.equals(
    "Navy variant price adjustment",
    navyVariant.price_adjustment,
    2000,
  );
  TestValidator.equals("Premium variant position", premiumVariant.position, 3);
  TestValidator.predicate(
    "Premium variant allows backorder",
    premiumVariant.inventory_policy === "continue",
  );
  TestValidator.predicate(
    "All variants belong to same product",
    largeVariant.shopping_mall_product_id === baseProduct.id &&
      navyVariant.shopping_mall_product_id === baseProduct.id &&
      premiumVariant.shopping_mall_product_id === baseProduct.id,
  );

  // Step 9: Validate variant display and customer configuration
  TestValidator.predicate(
    "Size unit is required",
    sizeUnit.is_required === true,
  );
  TestValidator.predicate(
    "Color unit uses swatches",
    colorUnit.display_style === "swatches",
  );
  TestValidator.predicate(
    "Size unit has lower sort order",
    sizeUnit.sort_order < colorUnit.sort_order,
  );
  TestValidator.predicate(
    "Navy variant has specific image",
    navyVariant.image?.includes("navy-blue") === true,
  );

  // Step 10: Test inventory management
  TestValidator.predicate(
    "Large variant has sufficient inventory",
    largeVariant.inventory_quantity > 0,
  );
  TestValidator.predicate(
    "Premium variant has limited stock",
    premiumVariant.inventory_quantity < 50,
  );
  TestValidator.predicate(
    "Base product SKU referenced in variant SKU",
    largeVariant.sku.includes(baseProduct.sku),
  );

  // Step 11: Validate pricing strategy
  TestValidator.predicate(
    "Premium variant has highest price adjustment",
    premiumVariant.price_adjustment > navyVariant.price_adjustment,
  );
  TestValidator.predicate(
    "Large variant has zero price adjustment",
    largeVariant.price_adjustment === 0,
  );
  TestValidator.predicate(
    "Cost adjustments align with price adjustments",
    navyVariant.cost_adjustment === 1500 &&
      premiumVariant.cost_adjustment === 3500,
  );

  // Step 12: Test variant accessibility
  TestValidator.predicate(
    "All variants are active",
    largeVariant.is_active === true &&
      navyVariant.is_active === true &&
      premiumVariant.is_active === true,
  );
  TestValidator.predicate(
    "Variants have unique SKUs",
    largeVariant.sku !== navyVariant.sku &&
      navyVariant.sku !== premiumVariant.sku &&
      largeVariant.sku !== premiumVariant.sku,
  );
}
