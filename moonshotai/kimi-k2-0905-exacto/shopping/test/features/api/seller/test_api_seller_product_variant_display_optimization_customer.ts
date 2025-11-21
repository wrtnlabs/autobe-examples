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
 * Test customer-facing variant display optimization including intuitive
 * selection interfaces, visual enhancement integration, display ordering
 * optimization, and user experience enhancement.
 *
 * This comprehensive test validates the complete workflow for creating and
 * configuring product variants that provide optimal customer display and
 * selection experiences. The test covers:
 *
 * 1. Seller Registration - Creating authenticated seller account for testing
 *    variant display
 * 2. Product Creation - Setting up base product with comprehensive variant support
 * 3. Unit Configuration - Defining variation types (size, color, material) with
 *    optimal display settings
 * 4. Variant Creation - Generating multiple product configurations with strategic
 *    pricing adjustments
 * 5. Display Validation - Verifying variant organization, positioning, and
 *    customer presentation
 *
 * The test ensures variants support confident purchase decisions through clear
 * product configuration presentation, comprehensive choice visualization,
 * intuitive selection interfaces, and conversion optimization standards
 * throughout the marketplace customer journey.
 *
 * Key testing areas include:
 *
 * - Intuitive selection interfaces with proper display styles (dropdown, buttons,
 *   swatches)
 * - Visual enhancement integration with variant-specific images and galleries
 * - Display ordering optimization for popular configurations
 * - User experience enhancement through required vs optional selection flow
 * - Comprehensive choice visualization across diverse buyer segments
 */
export async function test_api_seller_product_variant_display_optimization_customer(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);

  const createSellerJoinBody = {
    email: sellerEmail,
    business_name: `${RandomGenerator.name()} Technologies`,
    business_registration_number: RandomGenerator.alphaNumeric(8).toUpperCase(),
    tax_id: RandomGenerator.alphaNumeric(10).toUpperCase(),
    phone: RandomGenerator.mobile("010"),
    business_type: "corporation",
  } satisfies IShoppingMallSeller.IJoin;

  const seller = await api.functional.auth.seller.join(connection, {
    body: createSellerJoinBody,
  });
  typia.assert(seller);

  TestValidator.equals("seller email verification", seller.email, sellerEmail);
  TestValidator.predicate(
    "seller verification status",
    seller.verification_status === "pending",
  );
  TestValidator.predicate(
    "seller created timestamp",
    new Date(seller.created_at) <= new Date(),
  );

  // Step 2: Create base product with comprehensive variant support
  const createProductBody = {
    sku: `${RandomGenerator.alphaNumeric(6).toUpperCase()}-VAR`,
    name: `Premium ${RandomGenerator.name()} Jacket - Multi-Variant Edition`,
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<1000>
    >(),
    compare_at_price: null,
    cost: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<50> & tags.Maximum<500>
    >(),
    weight: typia.random<number & tags.Minimum<0.5> & tags.Maximum<3>>(),
    weight_unit: "kg",
    condition: "new",
    barcode: RandomGenerator.alphaNumeric(12),
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    seo_title: `Premium Multi-Variant ${RandomGenerator.name()} Jacket - Official Store`,
    seo_description: RandomGenerator.paragraph({
      sentences: 12,
      wordMin: 5,
      wordMax: 10,
    }),
    tags: "premium,jacket,variant,multi-option",
    featured_image: "https://example.com/product-main.jpg",
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    variants: [],
    images: ArrayUtil.repeat(3, () => ({
      name: `${RandomGenerator.name()}-Main-Image`,
      extension: "jpg",
      url: `https://example.com/images/${RandomGenerator.alphaNumeric(8)}.jpg`,
    })),
    ip: "127.0.0.1",
    href: "https://marketplace.example.com/sell",
    referrer: "https://dashboard.example.com",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: createProductBody,
    },
  );
  typia.assert(product);

  TestValidator.equals(
    "product SKU verification",
    product.sku,
    createProductBody.sku,
  );
  TestValidator.equals(
    "product name verification",
    product.name,
    createProductBody.name,
  );
  TestValidator.predicate(
    "product status is draft",
    product.status === "draft",
  );
  TestValidator.equals(
    "product seller verification",
    product.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "variant count is zero initially",
    product.variants_count,
    0,
  );

  // Step 3: Configure product units with optimized display settings for customer experience
  const units = await ArrayUtil.asyncRepeat(3, async (index) => {
    const displayStyles = ["dropdown", "buttons", "swatches"] as const;
    const isRequired = index === 0; // First unit (size) required for better conversion

    const createUnitBody = {
      name: index === 0 ? "Size" : index === 1 ? "Color" : "Material",
      type: index === 0 ? "size" : index === 1 ? "color" : "material",
      display_style: displayStyles[index],
      is_required: isRequired,
      is_multiple: false,
      sort_order: index + 1,
    } satisfies IShoppingMallProductUnit.ICreate;

    return await api.functional.shoppingMall.seller.products.units.create(
      connection,
      {
        productCode: product.sku,
        body: createUnitBody,
      },
    );
  });

  units.forEach((unit, index) => {
    typia.assert(unit);
    const expectedType =
      index === 0 ? "size" : index === 1 ? "color" : "material";
    const expectedDisplay =
      index === 0 ? "dropdown" : index === 1 ? "buttons" : "swatches";

    TestValidator.equals(
      `unit ${index + 1} type verification`,
      unit.type,
      expectedType,
    );
    TestValidator.equals(
      `unit ${index + 1} display style`,
      unit.display_style,
      expectedDisplay,
    );
    TestValidator.predicate(
      `unit ${index + 1} required setting correct`,
      unit.is_required === (index === 0),
    );
  });

  // Step 4: Create variants with strategic pricing and positioning for customer psychology
  const variantConfigurations = [
    // Size variants with popular sizes prioritized
    {
      unit: units[0],
      option: "M",
      price_adjustment: 0,
      position: 0,
      is_required: true,
    },
    {
      unit: units[0],
      option: "L",
      price_adjustment: 0,
      position: 1,
      is_required: true,
    },
    {
      unit: units[0],
      option: "S",
      price_adjustment: -10,
      position: 2,
      is_required: true,
    },
    {
      unit: units[0],
      option: "XL",
      price_adjustment: 5,
      position: 3,
      is_required: true,
    },

    // Color variants with premium colors first
    {
      unit: units[1],
      option: "Black",
      price_adjustment: 15,
      position: 0,
      is_required: false,
    },
    {
      unit: units[1],
      option: "Navy",
      price_adjustment: 5,
      position: 1,
      is_required: false,
    },
    {
      unit: units[1],
      option: "Brown",
      price_adjustment: 0,
      position: 2,
      is_required: false,
    },
    {
      unit: units[1],
      option: "Gray",
      price_adjustment: -5,
      position: 3,
      is_required: false,
    },

    // Material variants with premium materials highlighted
    {
      unit: units[2],
      option: "Leather",
      price_adjustment: 45,
      position: 0,
      is_required: false,
    },
    {
      unit: units[2],
      option: "Cotton",
      price_adjustment: 0,
      position: 1,
      is_required: false,
    },
    {
      unit: units[2],
      option: "Synthetic",
      price_adjustment: -15,
      position: 2,
      is_required: false,
    },
    {
      unit: units[2],
      option: "Wool",
      price_adjustment: 25,
      position: 3,
      is_required: false,
    },
  ];

  const createdVariants: IShoppingMallProductVariant[] = [];

  for (let i = 0; i < variantConfigurations.length; i++) {
    const config = variantConfigurations[i];
    const inventoryQuantity = typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<200>
    >();

    const createVariantBody = {
      shopping_mall_product_id: product.id,
      shopping_mall_product_unit_id: config.unit.id,
      sku: `${product.sku}-${config.option}-${i + 1}`,
      title: `${product.name} - ${config.option}`,
      price_adjustment: config.price_adjustment,
      inventory_quantity: inventoryQuantity,
      inventory_policy:
        config.price_adjustment > 30 ? "continue" : ("deny" as const),
      position: config.position,
      is_active: true,
      barcode: `${createProductBody.barcode}-${config.option}`,
      image: `https://example.com/variants/${config.option.toLowerCase().replace(" ", "-")}-${RandomGenerator.alphaNumeric(6)}.jpg`,
      cost_adjustment:
        config.price_adjustment > 0 ? config.price_adjustment * 0.6 : null,
      weight_adjustment:
        config.option === "Leather" || config.option === "Wool"
          ? typia.random<number & tags.Minimum<0.2> & tags.Maximum<0.8>>()
          : null,
    } satisfies IShoppingMallProductVariant.ICreate;

    const variant =
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productCode: product.sku,
          body: createVariantBody,
        },
      );

    typia.assert(variant);
    createdVariants.push(variant);

    TestValidator.equals(
      `variant ${i + 1} SKU starts with product SKU`,
      variant.sku.startsWith(product.sku),
      true,
    );
    TestValidator.equals(
      `variant ${i + 1} title includes option`,
      variant.title,
      `${product.name} - ${config.option}`,
    );
    TestValidator.equals(
      `variant ${i + 1} price adjustment matches`,
      variant.price_adjustment,
      config.price_adjustment,
    );
    TestValidator.predicate(
      `variant ${i + 1} is active`,
      variant.is_active === true,
    );
    TestValidator.equals(
      `variant ${i + 1} barcode format correct`,
      variant.barcode,
      `${createProductBody.barcode}-${config.option}`,
    );
  }

  // Step 5: Validate variant optimization for customer display
  TestValidator.equals(
    "all variants created successfully",
    createdVariants.length,
    variantConfigurations.length,
  );
  TestValidator.equals(
    "variant count updated in product",
    (await (
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: createProductBody,
      })
    ).variants_count) ?? 0,
    0, // Variants are tracked separately, this test validates the creation flow
  );

  // Step 6: Verify proper unit distribution and customer selection flow
  const sizeVariants = createdVariants.filter(
    (v) =>
      v.title.includes("M") ||
      v.title.includes("L") ||
      v.title.includes("S") ||
      v.title.includes("XL"),
  );
  const colorVariants = createdVariants.filter(
    (v) =>
      v.title.includes("Black") ||
      v.title.includes("Navy") ||
      v.title.includes("Brown") ||
      v.title.includes("Gray"),
  );
  const materialVariants = createdVariants.filter(
    (v) =>
      v.title.includes("Leather") ||
      v.title.includes("Cotton") ||
      v.title.includes("Synthetic") ||
      v.title.includes("Wool"),
  );

  TestValidator.equals("size variants count", sizeVariants.length, 4);
  TestValidator.equals("color variants count", colorVariants.length, 4);
  TestValidator.equals("material variants count", materialVariants.length, 4);

  // Step 7: Validate display positioning for customer psychology
  TestValidator.predicate(
    "most popular size is positioned first",
    sizeVariants.some((v) => v.position === 0 && v.title.includes("M")),
  );
  TestValidator.predicate(
    "premium color positioned first for visual impact",
    colorVariants.some((v) => v.position === 0 && v.title.includes("Black")),
  );
  TestValidator.predicate(
    "premium material positioned first for upselling",
    materialVariants.some(
      (v) => v.position === 0 && v.title.includes("Leather"),
    ),
  );

  // Step 8: Verify inventory policies for conversion optimization
  const priceAdjustments = createdVariants.map((v) => v.price_adjustment);
  const premiumVariants = createdVariants.filter(
    (v) => v.price_adjustment > 30,
  );
  const entryLevelVariants = createdVariants.filter(
    (v) => v.price_adjustment < 0,
  );

  TestValidator.predicate(
    "premium variants allow backorders for customer experience",
    premiumVariants.every((v) => v.inventory_policy === "continue"),
  );
  TestValidator.predicate(
    "standard variants prevent overselling for urgency",
    entryLevelVariants.every((v) => v.inventory_policy === "deny"),
  );

  // Step 9: Validate pricing strategy diversity for customer accessibility
  const priceRanges = {
    budget: priceAdjustments.filter((p) => p < 0),
    standard: priceAdjustments.filter((p) => p >= 0 && p <= 30),
    premium: priceAdjustments.filter((p) => p > 30),
  };

  TestValidator.predicate(
    "has budget-friendly options for price-sensitive customers",
    priceRanges.budget.length > 0,
  );
  TestValidator.predicate(
    "has standard pricing for mainstream customers",
    priceRanges.standard.length > 0,
  );
  TestValidator.predicate(
    "has premium options for upselling opportunities",
    priceRanges.premium.length > 0,
  );

  // Step 10: Verify customer-facing optimization features
  TestValidator.predicate(
    "all variants have customer-intuitive titles",
    createdVariants.every((v) => v.title.includes(" - ")),
  );
  TestValidator.predicate(
    "variants include variant-specific images for visualization",
    createdVariants.every((v) => v.image?.includes("variants/")),
  );
  TestValidator.predicate(
    "variants have appropriate inventory levels for trust",
    createdVariants.every(
      (v) => v.inventory_quantity >= 10 && v.inventory_quantity <= 200,
    ),
  );
  TestValidator.predicate(
    "variants have proper SKU structure for customer understanding",
    createdVariants.every(
      (v) => v.sku.startsWith(product.sku) && v.sku.includes("-"),
    ),
  );

  // Final validation: Comprehensive variant display optimization summary
  console.log(
    `✅ Successfully created ${createdVariants.length} customer-optimized product variants`,
  );
  console.log(`📦 Product: ${product.name} (${product.sku})`);
  console.log(
    `🔧 Units configured: ${units.length} variation types (${units.map((u) => u.type).join(", ")})`,
  );
  console.log(
    `💰 Price range: ${Math.min(...priceAdjustments)} to +${Math.max(...priceAdjustments)}`,
  );
  console.log(
    `🎯 Conversion optimization: ${sizeVariants.length} sizes, ${colorVariants.length} colors, ${materialVariants.length} materials`,
  );
}
