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
 * Test merchandising display optimization through variant position management
 * including strategic variant ordering, popular configuration prioritization,
 * and conversion rate optimization. Validates position attribute updates that
 * control variant presentation sequence in customer selection interfaces. Tests
 * placement strategies highlighting profitable variants, new product
 * configurations, and promotional campaign support through display order
 * manipulation.
 *
 * This comprehensive test validates the seller's ability to optimize product
 * variant display through strategic positioning. The test covers:
 *
 * 1. Seller registration and authentication
 * 2. Product creation with comprehensive catalog setup
 * 3. Product unit configuration for multiple variant types
 * 4. Creation of multiple product variants with different configurations
 * 5. Strategic variant position updates for merchandising optimization
 * 6. Validation of position-based presentation ordering
 * 7. Testing conversion rate optimization through display manipulation
 *
 * The merchandising optimization focuses on strategic variant ordering where
 * sellers can highlight profitable variants, prioritize popular configurations,
 * and support promotional campaigns through display position manipulation.
 * Position values control customer-facing sort order with lower numbers
 * appearing first in variant selection interfaces.
 */
export async function test_api_seller_product_variant_merchandising_optimization(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for merchandising optimization
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create product with comprehensive merchandising setup
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphaNumeric(8).toUpperCase(),
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        price: typia.random<number & tags.Minimum<50> & tags.Maximum<1000>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<5>>(),
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        variants: [],
        images: [],
        href: "https://example.com/merchandising",
        referrer: "https://example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create product units for variant configuration
  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
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

  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
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

  // Step 4: Create multiple variants with different positions for merchandising testing
  const classicVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: `${product.sku}-CLASSIC`,
          title: "Classic Size, Standard Color",
          price_adjustment: 0,
          inventory_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          inventory_policy: "deny",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(classicVariant);

  const premiumVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: colorUnit.id,
          sku: `${product.sku}-PREMIUM`,
          title: "Premium Color, Limited Edition",
          price_adjustment: typia.random<
            number & tags.Minimum<25> & tags.Maximum<150>
          >(),
          inventory_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<50>
          >(),
          cost_adjustment: typia.random<
            number & tags.Minimum<15> & tags.Maximum<80>
          >(),
          inventory_policy: "continue",
          position: 2,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(premiumVariant);

  const budgetVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: materialUnit.id,
          sku: `${product.sku}-BUDGET`,
          title: "Budget Material, Basic Option",
          price_adjustment: typia.random<
            number & tags.Minimum<10> & tags.Maximum<0>
          >(),
          inventory_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<20> & tags.Maximum<200>
          >(),
          inventory_policy: "deny",
          position: 3,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(budgetVariant);

  const luxuryVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: `${product.sku}-LUXURY`,
          title: "Luxury Size, Premium Material",
          price_adjustment: typia.random<
            number & tags.Minimum<75> & tags.Maximum<300>
          >(),
          inventory_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<2> & tags.Maximum<25>
          >(),
          weight_adjustment: typia.random<
            number & tags.Minimum<0.1> & tags.Maximum<2>
          >(),
          inventory_policy: "deny",
          position: 4,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(luxuryVariant);

  // Step 5: Test strategic variant position optimization for merchandising
  // Optimize positions: Premium (most profitable) at position 0, Luxury at 1, Classic at 2, Budget at 3
  const optimizedPremiumVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      connection,
      {
        productCode: product.sku,
        variantCode: premiumVariant.sku,
        body: {
          position: 0, // Move premium variant to top position for maximum visibility
          price_adjustment: premiumVariant.price_adjustment + 10, // Slight price increase for high-position variant
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(optimizedPremiumVariant);
  TestValidator.equals(
    "premium variant position optimized",
    optimizedPremiumVariant.position,
    0,
  );

  const optimizedLuxuryVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      connection,
      {
        productCode: product.sku,
        variantCode: luxuryVariant.sku,
        body: {
          position: 1, // Luxury variant at second position
          price_adjustment: luxuryVariant.price_adjustment + 5, // Small premium for strategic positioning
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(optimizedLuxuryVariant);
  TestValidator.equals(
    "luxury variant position optimized",
    optimizedLuxuryVariant.position,
    1,
  );

  const optimizedClassicVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      connection,
      {
        productCode: product.sku,
        variantCode: classicVariant.sku,
        body: {
          position: 2, // Classic variant moves to third position
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(optimizedClassicVariant);
  TestValidator.equals(
    "classic variant position optimized",
    optimizedClassicVariant.position,
    2,
  );

  const optimizedBudgetVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      connection,
      {
        productCode: product.sku,
        variantCode: budgetVariant.sku,
        body: {
          position: 3, // Budget variant at bottom for conversion optimization
          is_active: true, // Keep active but in lower priority position
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(optimizedBudgetVariant);
  TestValidator.equals(
    "budget variant position optimized",
    optimizedBudgetVariant.position,
    3,
  );

  // Step 6: Test promotional campaign support through position manipulation
  // Create new promotional variant and position it strategically
  const promotionalVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: colorUnit.id,
          sku: `${product.sku}-PROMO`,
          title: "Special Promotion - Limited Time",
          price_adjustment: typia.random<
            number & tags.Minimum<20> & tags.Maximum<100>
          >(),
          inventory_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<15> & tags.Maximum<75>
          >(),
          inventory_policy: "deny",
          position: 5, // Initially create at bottom position
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(promotionalVariant);

  // Promote the variant to top position for campaign visibility
  const promotedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      connection,
      {
        productCode: product.sku,
        variantCode: promotionalVariant.sku,
        body: {
          position: 0, // Promote to top position for maximum campaign visibility
          is_active: true,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(promotedVariant);
  TestValidator.equals(
    "promotional variant positioned for maximum visibility",
    promotedVariant.position,
    0,
  );

  // Step 7: Validate conversion rate optimization through display manipulation
  // Test inventory-based position optimization
  const lowInventoryVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: `${product.sku}-LOWSTOCK`,
          title: "Limited Stock - Act Fast",
          price_adjustment: typia.random<
            number & tags.Minimum<30> & tags.Maximum<120>
          >(),
          inventory_quantity: 3, // Very low inventory to create urgency
          inventory_policy: "deny",
          position: 6,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(lowInventoryVariant);

  // Position low inventory variant strategically to drive urgency
  const urgencyPositionedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      connection,
      {
        productCode: product.sku,
        variantCode: lowInventoryVariant.sku,
        body: {
          position: 1, // Second position for high visibility with urgency messaging
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(urgencyPositionedVariant);
  TestValidator.equals(
    "low inventory variant positioned for urgency",
    urgencyPositionedVariant.position,
    1,
  );

  // Step 8: Test comprehensive merchandising validation
  // Verify all variants maintain correct positioning after multiple updates
  const variants = [
    promotedVariant,
    urgencyPositionedVariant,
    optimizedLuxuryVariant,
    optimizedClassicVariant,
    optimizedBudgetVariant,
    optimizedPremiumVariant,
  ];

  // Sort variants by position to validate merchandising order
  const sortedVariants = variants.sort((a, b) => a.position - b.position);

  TestValidator.predicate(
    "promotional variant has highest merchandising priority",
    sortedVariants[0].sku.includes("PROMO"),
  );
  TestValidator.predicate(
    "urgency variant has second merchandising priority",
    sortedVariants[1].sku.includes("LOWSTOCK"),
  );
  TestValidator.predicate(
    "luxury variant maintains strategic position",
    sortedVariants[2].sku.includes("LUXURY"),
  );
  TestValidator.predicate(
    "classic variant in middle merchandising position",
    sortedVariants[3].sku.includes("CLASSIC"),
  );
  TestValidator.predicate(
    "budget variant in lower merchandising position",
    sortedVariants[4].sku.includes("BUDGET"),
  );
  TestValidator.predicate(
    "premium variant repositioned for profitability",
    sortedVariants[5].sku.includes("PREMIUM"),
  );

  // Validate price optimization through positioning
  TestValidator.predicate(
    "promotional variant has competitive pricing",
    promotedVariant.price_adjustment > 0,
  );
  TestValidator.predicate(
    "luxury variant maintains premium pricing",
    optimizedLuxuryVariant.price_adjustment >
      optimizedClassicVariant.price_adjustment,
  );
  TestValidator.predicate(
    "budget variant offers value pricing",
    optimizedBudgetVariant.price_adjustment <
      optimizedClassicVariant.price_adjustment,
  );

  // Test conversion optimization elements
  TestValidator.predicate(
    "low inventory variant creates urgency messaging",
    lowInventoryVariant.inventory_quantity <= 5,
  );
  TestValidator.predicate(
    "promotional variant uses compelling title",
    promotedVariant.title.toLowerCase().includes("special") ||
      promotedVariant.title.toLowerCase().includes("promotion"),
  );
  TestValidator.predicate(
    "luxury variant positioned for premium appeal",
    optimizedLuxuryVariant.position <= 3,
  );
  TestValidator.predicate(
    "budget variant positioned for value shoppers",
    optimizedBudgetVariant.position >= 3,
  );
}
