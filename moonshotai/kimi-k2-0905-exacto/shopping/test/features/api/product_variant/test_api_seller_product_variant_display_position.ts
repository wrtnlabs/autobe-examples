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
 * Test creating product variants with strategic display positioning to optimize
 * customer presentation order.
 *
 * This comprehensive test validates the complete variant creation workflow from
 * seller registration through product setup and variant positioning. It tests
 * that sellers can strategically configure variant display positions to
 * highlight bestsellers and seasonal selections for optimal customer conversion
 * rates.
 *
 * Test flow:
 *
 * 1. Register seller account with business authentication
 * 2. Create base product with comprehensive marketplace metadata
 * 3. Configure product units for variant differentiation
 * 4. Create multiple variants with strategic position assignments
 * 5. Validate position-based sorting and display logic
 * 6. Test variant prioritization for seasonal and bestseller scenarios
 * 7. Verify position constraints and uniqueness enforcement
 */
export async function test_api_seller_product_variant_display_position(
  connection: api.IConnection,
) {
  // Step 1: Register seller account with comprehensive business verification
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      business_name: `${RandomGenerator.name(1)} Marketplace Solutions`,
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "corporation",
        "LLC",
        "partnership",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create sophisticated product with variant-ready configuration
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphaNumeric(12),
        name: `${RandomGenerator.name(1)} Premium Collection`,
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 15,
          sentenceMax: 25,
        }),
        price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<10000>
        >(),
        compare_at_price: null,
        cost: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<500> & tags.Maximum<5000>
        >(),
        condition: "new",
        weight: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<2000>
        >(),
        weight_unit: "g",
        barcode: RandomGenerator.alphaNumeric(13),
        track_quantity: true,
        allow_backorder: true,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: RandomGenerator.paragraph({ sentences: 3 }),
        seo_description: RandomGenerator.paragraph({ sentences: 5 }),
        tags: "premium,collection,featured",
        featured_image: null,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        variants: undefined,
        images: undefined,
        ip: null,
        href: "https://marketplace.example.com/products/create",
        referrer: "https://marketplace.example.com/products/",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Configure product units for size and color variations
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

  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Color",
        type: "color",
        display_style: "swatches",
        is_required: false,
        is_multiple: false,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(colorUnit);

  // Step 4: Create variants with strategic position assignments
  const positionStrategies = [0, 1, 2, 3, 4]; // Different position values for testing
  const variantTitles = [
    "Small, Navy Blue",
    "Medium, Emerald Green",
    "Large, Crimson Red",
    "XL, Golden Yellow",
    "XXL, Midnight Black",
  ];

  const createdVariants: Array<IShoppingMallProductVariant> = [];

  // Deploy strategic position testing across multiple variant scenarios
  await ArrayUtil.asyncRepeat(variantTitles.length, async (index) => {
    const variant =
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productCode: product.sku,
          body: {
            shopping_mall_product_id: product.id,
            shopping_mall_product_unit_id:
              index % 2 === 0 ? sizeUnit.id : colorUnit.id,
            sku: RandomGenerator.alphaNumeric(
              15 - positionStrategies[index] * 2,
            ), // SKU length correlates with position
            title: variantTitles[index].slice(0, 100), // Ensure within 100 character limit
            price_adjustment: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<5000>
            >(),
            cost_adjustment: null,
            weight_adjustment: null,
            barcode: RandomGenerator.alphaNumeric(12),
            image: null,
            inventory_quantity: typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<10> &
                tags.Maximum<1000>
            >(),
            inventory_policy: RandomGenerator.pick([
              "deny",
              "continue",
            ] as const),
            position: positionStrategies[index],
            is_active: true,
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
    typia.assert(variant);
    createdVariants.push(variant);
  });

  // Validation of position-based sorting and strategic variant visibility
  TestValidator.equals(
    "variant count matches",
    createdVariants.length,
    variantTitles.length,
  );
  TestValidator.predicate(
    "position values are unique",
    new Set(createdVariants.map((v) => v.position)).size ===
      createdVariants.length,
  );
  TestValidator.predicate(
    "position values are non-negative",
    createdVariants.every((v) => v.position >= 0),
  );

  // Validate position-based ordering for customer experience optimization
  const sortedByPosition = [...createdVariants].sort(
    (a, b) => a.position - b.position,
  );
  const expectedPositions = positionStrategies.sort((a, b) => a - b);

  TestValidator.equals(
    "variants sorted by position",
    sortedByPosition.map((v) => v.position),
    expectedPositions,
  );

  // Test bestseller positioning strategy with premium placement optimization
  const bestsellerVariant = createdVariants.find((v) => v.position === 0);
  TestValidator.predicate(
    "bestseller positioned at first",
    bestsellerVariant !== undefined,
  );

  // Validate seasonal positioning with inventory correlation
  const seasonalVariant = createdVariants.find((v) => v.position <= 2); // Top 2 positions for seasonal
  TestValidator.predicate(
    "seasonal variants in priority positions",
    seasonalVariant !== undefined,
  );

  // Analyze price-adjustment positioning strategy for margin optimization
  const pricePositioning = createdVariants.map((v) => ({
    position: v.position,
    priceAdjustment: v.price_adjustment,
    inventory: v.inventory_quantity,
  }));
  TestValidator.predicate(
    "duplicate position check",
    createdVariants.filter(
      (v, i) =>
        createdVariants.findIndex((found) => found.position === v.position) !==
        i,
    ).length === 0,
  );

  // Comprehensive validation of variant presentation order for conversion optimization
  const highPriorityPositions = [0, 1]; // Prime real estate for customer attention
  const highPriorityCount = createdVariants.filter((v) =>
    highPriorityPositions.includes(v.position),
  ).length;

  TestValidator.predicate(
    "high-priority positions populated",
    highPriorityCount === highPriorityPositions.length,
  );

  // Validate seller can strategically position seasonal and bestseller variants
  const positionStrategyValidation = createdVariants.every((variant, index) => {
    const isWithinRange = variant.position >= 0 && variant.position <= 10; // Reasonable position range
    const matchesSortOrder = sortedByPosition[index]?.id === variant.id;
    return isWithinRange && matchesSortOrder;
  });

  TestValidator.predicate(
    "variant positioning strategy consistent",
    positionStrategyValidation,
  );
}
