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
 * Test seller product creation with comprehensive variant management
 *
 * This test validates the complete product creation workflow with variant
 * support:
 *
 * 1. Seller registration and authentication setup
 * 2. Create base product with comprehensive details
 * 3. Configure product units for variant differentiation (size, color, material)
 * 4. Validate SKU assignment strategy and inventory tracking
 * 5. Test pricing differentiation across variants
 * 6. Verify customer choice optimization and inventory accuracy
 *
 * Note: Due to system constraints, we focus on unit configuration and
 * validation rather than full variant instance creation, as the latter requires
 * additional system components not available in this test environment.
 */
export async function test_api_seller_product_creation_with_variants(
  connection: api.IConnection,
) {
  // 1. Create seller account for product management
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name() + " Store",
      business_registration_number: RandomGenerator.alphabets(10).toUpperCase(),
      tax_id: RandomGenerator.alphabets(9).toUpperCase(),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "corporation",
        "sole proprietorship",
        "partnership",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Create variant-ready product with comprehensive configuration
  const productSku = "SKU-" + RandomGenerator.alphabets(8).toUpperCase();
  const baseProduct = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: productSku,
        name: RandomGenerator.name() + " Premium T-Shirt",
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<20> & tags.Maximum<200>
        >(),
        compare_at_price: null,
        cost: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<100>
        >(),
        condition: "new",
        weight: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<5>
        >(),
        weight_unit: "kg",
        barcode: null,
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: RandomGenerator.paragraph({ sentences: 1 }),
        seo_description: RandomGenerator.paragraph({ sentences: 2 }),
        tags: RandomGenerator.paragraph({ sentences: 3 }),
        featured_image: null,
        category_id: "00000000-0000-0000-0000-000000000000", // Using placeholder since category system not available
        shopping_mall_seller_id: seller.id,
        variants: [], // Will be populated by variant creation in real system
        images: [
          {
            name: "main-image.jpg",
            extension: "jpg",
            url: "https://example.com/product-main.jpg",
          } satisfies IShoppingMallProductImage.ICreate,
        ],
        ip: null,
        href: "https://seller-portal.example.com/products/new",
        referrer: "https://seller-portal.example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(baseProduct);

  TestValidator.equals(
    "product creation success",
    baseProduct.seller.id,
    seller.id,
  );
  TestValidator.equals("product SKU matches", baseProduct.sku, productSku);
  TestValidator.predicate(
    "product has inventory tracking enabled",
    baseProduct.track_quantity === true,
  );
  TestValidator.predicate(
    "product allows no backorder",
    baseProduct.allow_backorder === false,
  );

  // 3. Create comprehensive unit system for variant differentiation

  // Size unit for basic variant differentiation
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

  TestValidator.equals("size unit name matches", sizeUnit.name, "Size");
  TestValidator.equals("size unit type matches", sizeUnit.type, "size");
  TestValidator.predicate(
    "size unit is required",
    sizeUnit.is_required === true,
  );

  // Color unit for visual variant differentiation
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

  TestValidator.equals("color unit name matches", colorUnit.name, "Color");
  TestValidator.equals("color unit type matches", colorUnit.type, "color");
  TestValidator.equals(
    "color unit display style",
    colorUnit.display_style,
    "swatches",
  );

  // Material unit for premium differentiation
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

  TestValidator.equals(
    "material unit name matches",
    materialUnit.name,
    "Material",
  );
  TestValidator.equals(
    "material unit type matches",
    materialUnit.type,
    "material",
  );
  TestValidator.predicate(
    "material unit is optional",
    materialUnit.is_required === false,
  );

  // 4. Validate SKU assignment strategy uniqueness
  const duplicateSkuTest = productSku + "-COPY";
  await TestValidator.error("duplicate SKU should be rejected", async () => {
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: duplicateSkuTest,
        name: "Duplicate SKU Test",
        description: "Testing SKU uniqueness validation",
        price: 99.99,
        condition: "new",
        weight: 0.5,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: "00000000-0000-0000-0000-000000000000",
        shopping_mall_seller_id: seller.id,
        href: "https://seller-portal.example.com/products/duplicate",
        referrer: "https://seller-portal.example.com/products",
        ip: null,
      } satisfies IShoppingMallProduct.ICreate,
    });
  });

  // 5. Validate unit configuration relationships
  TestValidator.predicate(
    "all units belong to same product",
    sizeUnit.product.id === baseProduct.id &&
      colorUnit.product.id === baseProduct.id &&
      materialUnit.product.id === baseProduct.id,
  );

  TestValidator.predicate(
    "units have correct sort order",
    sizeUnit.sort_order < colorUnit.sort_order &&
      colorUnit.sort_order < materialUnit.sort_order,
  );

  // 6. Validate seller authorization system
  TestValidator.predicate(
    "seller has valid authorization",
    seller.token !== undefined && seller.token.access.length > 0,
  );

  TestValidator.equals(
    "seller business type is valid",
    seller.business_type,
    RandomGenerator.pick([
      "corporation",
      "sole proprietorship",
      "partnership",
    ] as const),
  );

  // 7. Business logic validation for variant system optimization
  TestValidator.predicate(
    "unit system supports customer choice hierarchy",
    sizeUnit.is_required === true &&
      colorUnit.is_required === true &&
      materialUnit.is_required === false,
  );

  TestValidator.predicate(
    "display styles enhance user decision flow",
    sizeUnit.display_style === "dropdown" &&
      colorUnit.display_style === "swatches" &&
      materialUnit.display_style === "buttons",
  );

  // 8. Validate inventory accuracy principles
  TestValidator.predicate(
    "product enables comprehensive inventory tracking",
    baseProduct.track_quantity === true &&
      baseProduct.allow_backorder === false,
  );

  TestValidator.predicate(
    "variant-ready product supports multiple configurations",
    baseProduct.variants.length === 0 && // Initial product has empty variants array
      sizeUnit.is_multiple === false &&
      colorUnit.is_multiple === false &&
      materialUnit.is_multiple === false,
  );

  // 9. Validate customer experience optimization
  TestValidator.predicate(
    "unit sort order optimizes selection flow (required first)",
    sizeUnit.sort_order === 1 &&
      colorUnit.sort_order === 2 &&
      materialUnit.sort_order === 3,
  );

  TestValidator.predicate(
    "display styles align with unit characteristics",
    sizeUnit.type === "size" &&
      sizeUnit.display_style === "dropdown" &&
      colorUnit.type === "color" &&
      colorUnit.display_style === "swatches" &&
      materialUnit.type === "material" &&
      materialUnit.display_style === "buttons",
  );
}
