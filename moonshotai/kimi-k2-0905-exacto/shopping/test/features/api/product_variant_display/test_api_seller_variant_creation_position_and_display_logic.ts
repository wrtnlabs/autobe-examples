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

export async function test_api_seller_variant_creation_position_and_display_logic(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for testing
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile("010"),
      business_type: RandomGenerator.pick([
        "corporation",
        "partnership",
        "llc",
        "sole_proprietorship",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create product for multiple variant scenarios
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `SKU-${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<1000>
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
        seo_title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 8,
        }),
        seo_description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 6,
        }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/seller/product",
        referrer: "https://example.com/seller/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create product units for variant configuration
  // Size unit - required selection
  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Size",
        type: "size",
        display_style: "buttons",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(sizeUnit);

  // Color unit - required selection
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

  // Material unit - optional selection with multiple choices
  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Material",
        type: "material",
        display_style: "dropdown",
        is_required: false,
        is_multiple: true,
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(materialUnit);

  // Step 4: Create variants with different position values for display testing
  // Create multiple variants with strategic position assignments
  const positions = [0, 1, 2, 3, 4]; // Different position values for testing
  const variants: IShoppingMallProductVariant[] = [];

  for (let i = 0; i < positions.length; i++) {
    // Create variant data with proper type handling
    const variantData = {
      shopping_mall_product_id: product.id,
      shopping_mall_product_unit_id: i % 2 === 0 ? sizeUnit.id : colorUnit.id,
      sku: `VAR-${product.sku}-${positions[i]}-${RandomGenerator.alphaNumeric(3)}`,
      title: `Variant Position ${positions[i]} - ${i % 2 === 0 ? "Size" : "Color"}`,
      price_adjustment: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<500>
      >(),
      cost_adjustment:
        i % 3 === 0
          ? typia.random<
              number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<200>
            >()
          : (null as any),
      weight_adjustment:
        i % 2 === 0
          ? typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
            >()
          : (null as any),
      barcode:
        i % 2 === 0 ? `BAR-${RandomGenerator.alphaNumeric(6)}` : (null as any),
      image:
        i % 3 === 0
          ? `https://example.com/images/product-${positions[i]}.jpg`
          : (null as any),
      inventory_quantity: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<100>
      >(),
      inventory_policy: RandomGenerator.pick(["deny", "continue"] as const) as
        | "deny"
        | "continue",
      position: positions[i],
      is_active: i % 2 === 0,
    } satisfies IShoppingMallProductVariant.ICreate;

    const variant =
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productCode: product.sku,
          body: variantData,
        },
      );
    typia.assert(variant);
    variants.push(variant);
  }

  // Step 5: Validate position-based display ordering works correctly
  TestValidator.equals("number of variants created", variants.length, 5);

  // Verify that variant positions are correctly set
  for (let i = 0; i < variants.length; i++) {
    TestValidator.equals(
      `variant ${i} position matches expected`,
      variants[i].position,
      positions[i],
    );
  }

  // Validate position ordering logic (lower positions should have higher display priority)
  const sortedVariants = variants.sort((a, b) => a.position - b.position);
  TestValidator.equals(
    "variants are ordered by position",
    sortedVariants.map((v) => v.position),
    positions,
  );

  // Step 6: Test display priority configuration for seller optimization
  const priorityVariants = variants.filter((v) => v.position <= 2); // Top 3 priority positions
  TestValidator.equals(
    "priority variants have position ≤ 2",
    priorityVariants.length,
    3,
  );

  // Verify active/inactive status distribution
  const activeVariants = variants.filter((v) => v.is_active);
  TestValidator.predicate(
    "at least 2 variants are active",
    activeVariants.length >= 2,
  );

  // Step 7: Test variant stock management integration
  const totalInventory = variants.reduce(
    (sum, variant) => sum + variant.inventory_quantity,
    0,
  );
  TestValidator.predicate(
    "total inventory across variants is positive",
    totalInventory > 0,
  );

  // Validate individual variant properties
  const sampleVariant = variants[0];
  TestValidator.predicate(
    "variant SKU follows expected pattern",
    sampleVariant.sku.startsWith("VAR-"),
  );
  TestValidator.predicate(
    "variant title is descriptive",
    sampleVariant.title.includes("Position"),
  );

  // Test price adjustment range
  TestValidator.predicate(
    "price adjustment is within reasonable range",
    sampleVariant.price_adjustment >= 0 &&
      sampleVariant.price_adjustment <= 500,
  );

  // Validate inventory management settings
  TestValidator.predicate(
    "inventory policy is one of allowed values",
    sampleVariant.inventory_policy === "deny" ||
      sampleVariant.inventory_policy === "continue",
  );

  // Step 8: Test variant positioning strategy for optimal customer experience
  const positionStrategy = variants.map((v) => ({
    position: v.position,
    title: v.title,
    is_active: v.is_active,
    inventory: v.inventory_quantity,
  }));

  // Verify seller optimization possibilities
  TestValidator.predicate(
    "position 0 variant exists",
    positionStrategy.some((s) => s.position === 0),
  );

  TestValidator.predicate(
    "highest priority position (0) is optimized",
    positionStrategy.filter((s) => s.position === 0).length === 1,
  );

  // Validate variant coverage across position ranges
  const lowPositions = variants.filter((v) => v.position < 3);
  const highPositions = variants.filter((v) => v.position >= 3);

  TestValidator.equals("low position variants count", lowPositions.length, 3);
  TestValidator.equals("high position variants count", highPositions.length, 2);

  // Final validation of display ordering system
  TestValidator.predicate(
    "variants provide complete coverage for testing",
    variants.length >= 5,
  );
  TestValidator.predicate(
    "position values are unique",
    new Set(variants.map((v) => v.position)).size === variants.length,
  );

  console.log(
    "Variant creation with position display logic test completed successfully",
  );
  console.log("Total variants created:", variants.length);
  console.log(
    "Position range:",
    Math.min(...variants.map((v) => v.position)),
    "to",
    Math.max(...variants.map((v) => v.position)),
  );
  console.log("Active variants:", activeVariants.length);
}
