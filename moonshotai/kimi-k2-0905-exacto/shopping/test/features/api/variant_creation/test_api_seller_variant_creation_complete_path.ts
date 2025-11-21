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
 * Test comprehensive variant creation covering the complete multi-step process.
 *
 * This test validates the complete variant creation workflow in a shopping mall
 * marketplace, covering seller authentication, product creation, unit
 * configuration, and variant generation with comprehensive business logic
 * validation. The test ensures proper variant identity through unique SKU
 * assignments, validates price adjustments for premium vs basic materials,
 * verifies individual inventory tracking for overselling prevention, and
 * confirms customer interface displays with proper configuration information.
 *
 * Test Flow:
 *
 * 1. Create seller account for authentication and product ownership
 * 2. Create parent product for variant attachment
 * 3. Configure product units for size, color, and material variations
 * 4. Create multiple variants with different configurations
 * 5. Test price adjustments (premium materials increase, basic decrease)
 * 6. Validate inventory policies and individual tracking
 * 7. Verify variant-specific images and display properties
 * 8. Confirm proper SKU uniqueness across all variants
 * 9. Test variant positioning and customer-facing display
 *
 * Business Logic Validated:
 *
 * - Unique SKU generation for each size/color/material combination
 * - Price adjustment mechanics for premium vs basic materials
 * - Inventory policy enforcement per variant configuration
 * - Weight adjustment calculations for shipping cost differences
 * - Variant title generation with proper configuration display
 * - Image upload and variant-specific visual presentation
 */
export async function test_api_seller_variant_creation_complete_path(
  connection: api.IConnection,
) {
  // Create seller account for authentication
  const sellerJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    business_name: RandomGenerator.name(2),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    tax_id: RandomGenerator.alphaNumeric(9),
    phone: RandomGenerator.mobile(),
    business_type: "corporation",
  } satisfies IShoppingMallSeller.IJoin;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerJoinData,
  });
  typia.assert(seller);

  // Create parent product for variant generation
  const productCreateData = {
    sku: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    name: `Premium ${RandomGenerator.name(2)} Product`,
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    price: 199.99,
    condition: "new",
    weight: 2.5,
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    href: `${RandomGenerator.name(1)}/products/create`,
    referrer: `${RandomGenerator.name(1)}/dashboard/products`,
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productCreateData,
    },
  );
  typia.assert(product);
  TestValidator.equals(
    "product SKU matches creation data",
    product.sku,
    productCreateData.sku,
  );

  // Create unit configurations for size variations
  const sizeUnitData = {
    name: "Size",
    type: "size",
    display_style: "dropdown",
    is_required: true,
    is_multiple: false,
    sort_order: 1,
  } satisfies IShoppingMallProductUnit.ICreate;

  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: sizeUnitData,
    });
  typia.assert(sizeUnit);

  // Create unit configurations for color variations
  const colorUnitData = {
    name: "Color",
    type: "color",
    display_style: "swatches",
    is_required: true,
    is_multiple: false,
    sort_order: 2,
  } satisfies IShoppingMallProductUnit.ICreate;

  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: colorUnitData,
    });
  typia.assert(colorUnit);

  // Create unit configurations for material variations
  const materialUnitData = {
    name: "Material",
    type: "material",
    display_style: "buttons",
    is_required: true,
    is_multiple: false,
    sort_order: 3,
  } satisfies IShoppingMallProductUnit.ICreate;

  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: materialUnitData,
    });
  typia.assert(materialUnit);

  // Create premium variant with price increase
  const premiumVariantData = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_unit_id: sizeUnit.id,
    sku: `${product.sku}-L-BLK-PREMIUM`,
    title: "Large, Black, Premium Material",
    price_adjustment: 49.99,
    cost_adjustment: 30.0,
    weight_adjustment: 0.5,
    inventory_quantity: 15,
    inventory_policy: "deny",
    position: 0,
    is_active: true,
  } satisfies IShoppingMallProductVariant.ICreate;

  const premiumVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: premiumVariantData,
      },
    );
  typia.assert(premiumVariant);
  TestValidator.equals(
    "premium variant SKU is unique",
    premiumVariant.sku,
    premiumVariantData.sku,
  );
  TestValidator.equals(
    "premium variant price adjustment",
    premiumVariant.price_adjustment,
    49.99,
  );
  TestValidator.equals(
    "premium variant has cost adjustment",
    premiumVariant.cost_adjustment,
    30.0,
  );

  // Create basic variant with price decrease
  const basicVariantData = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_unit_id: colorUnit.id,
    sku: `${product.sku}-M-NVY-BASIC`,
    title: "Medium, Navy, Basic Material",
    price_adjustment: -19.99,
    cost_adjustment: -10.0,
    weight_adjustment: -0.3,
    inventory_quantity: 25,
    inventory_policy: "continue",
    position: 1,
    is_active: true,
  } satisfies IShoppingMallProductVariant.ICreate;

  const basicVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: basicVariantData,
      },
    );
  typia.assert(basicVariant);
  TestValidator.equals(
    "basic variant SKU is unique",
    basicVariant.sku,
    basicVariantData.sku,
  );
  TestValidator.equals(
    "basic variant price adjustment negative",
    basicVariant.price_adjustment,
    -19.99,
  );
  TestValidator.equals(
    "basic variant has cost adjustment",
    basicVariant.cost_adjustment,
    -10.0,
  );

  // Create variant with image and barcode
  const imageVariantData = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_unit_id: materialUnit.id,
    sku: `${product.sku}-XL-GRN-STANDARD`,
    title: "Extra Large, Green, Standard Material",
    price_adjustment: 0,
    barcode: `UPC-${RandomGenerator.alphaNumeric(10)}`,
    image: `https://example.com/products/${product.sku}/xl-green-standard.jpg`,
    inventory_quantity: 10,
    inventory_policy: "deny",
    position: 2,
    is_active: true,
  } satisfies IShoppingMallProductVariant.ICreate;

  const imageVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: imageVariantData,
      },
    );
  typia.assert(imageVariant);
  TestValidator.equals(
    "image variant has barcode",
    imageVariant.barcode,
    imageVariantData.barcode,
  );
  TestValidator.equals(
    "image variant has image URL",
    imageVariant.image,
    imageVariantData.image,
  );

  // Test SKU uniqueness enforcement
  await TestValidator.error("duplicate SKU should fail", async () => {
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          ...premiumVariantData,
          shopping_mall_product_unit_id: colorUnit.id,
        },
      },
    );
  });

  // Verify variant relationships and properties
  TestValidator.predicate(
    "all variants belong to same product",
    premiumVariant.shopping_mall_product_id === product.id &&
      basicVariant.shopping_mall_product_id === product.id &&
      imageVariant.shopping_mall_product_id === product.id,
  );

  // Test inventory policy differences
  TestValidator.equals(
    "premium variant enforces deny policy",
    premiumVariant.inventory_policy,
    "deny",
  );
  TestValidator.equals(
    "basic variant allows continue policy",
    basicVariant.inventory_policy,
    "continue",
  );
  TestValidator.equals(
    "image variant enforces deny policy",
    imageVariant.inventory_policy,
    "deny",
  );

  // Validate variant positioning
  TestValidator.equals(
    "premium variant positioned first",
    premiumVariant.position,
    0,
  );
  TestValidator.equals(
    "basic variant positioned second",
    basicVariant.position,
    1,
  );
  TestValidator.equals(
    "image variant positioned third",
    imageVariant.position,
    2,
  );

  // Verify weight adjustments for shipping calculations
  TestValidator.predicate(
    "premium variant adds weight",
    premiumVariant.weight_adjustment! > 0,
  );
  TestValidator.predicate(
    "basic variant reduces weight",
    basicVariant.weight_adjustment! < 0,
  );
  TestValidator.equals(
    "image variant has no weight change",
    imageVariant.weight_adjustment,
    0,
  );

  // Test variant-specific business logic
  const variants = [premiumVariant, basicVariant, imageVariant];

  // Verify SKU format consistency
  variants.forEach((variant, index) => {
    TestValidator.predicate(
      `variant ${index} SKU follows product pattern`,
      variant.sku.startsWith(product.sku),
    );
  });

  // Verify title format and information completeness
  TestValidator.predicate(
    "premium variant title includes material type",
    premiumVariant.title.toLowerCase().includes("premium"),
  );
  TestValidator.predicate(
    "basic variant title includes material type",
    basicVariant.title.toLowerCase().includes("basic"),
  );
  TestValidator.equals(
    "image variant title has standard material",
    imageVariant.title,
    "Extra Large, Green, Standard Material",
  );

  // Validate inventory tracking independence
  const inventoryQuantities = variants.map((v) => v.inventory_quantity);
  TestValidator.notEquals(
    "variant inventories are independent",
    inventoryQuantities[0],
    inventoryQuantities[1],
  );
  TestValidator.notEquals(
    "variant inventories are independent",
    inventoryQuantities[0],
    inventoryQuantities[2],
  );
  TestValidator.notEquals(
    "variant inventories are independent",
    inventoryQuantities[1],
    inventoryQuantities[2],
  );

  // Test business logic for variant activation
  TestValidator.predicate(
    "all created variants are active",
    variants.every((v) => v.is_active === true),
  );
}
