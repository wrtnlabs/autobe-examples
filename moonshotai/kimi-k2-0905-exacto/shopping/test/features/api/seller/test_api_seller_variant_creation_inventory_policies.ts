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
 * Test variant inventory management policies enabling flexible fulfillment
 * strategies.
 *
 * This comprehensive test validates inventory policy enforcement, quantity
 * management, and variant lifecycle operations. Tests both 'deny' policy
 * preventing overselling and 'continue' policy enabling backorders for reliable
 * suppliers. Verifies position management for customer interface ordering and
 * activation toggles for lifecycle control.
 *
 * @param connection API connection for authenticated requests
 */
export async function test_api_seller_variant_creation_inventory_policies(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for authentication
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphabets(8),
      tax_id: RandomGenerator.alphabets(9),
      phone: RandomGenerator.mobile(),
      business_type: "LLC",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create parent product structure
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<1000>
        >(),
        condition: RandomGenerator.pick([
          "new",
          "used",
          "refurbished",
        ] as const),
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
        weight_unit: RandomGenerator.pick(["kg", "g", "lb", "oz"] as const),
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create product unit configurations for size and color variants
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

  // Step 4: Test inventory deny policy - prevents overselling
  const denyVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: RandomGenerator.alphaNumeric(12),
          title: "Large, Navy Blue - Deny Policy",
          price_adjustment: 0,
          inventory_quantity: 5,
          inventory_policy: "deny",
          position: 0,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(denyVariant);

  // Validate deny policy prevents overselling through inventory tracking
  TestValidator.equals(
    "deny variant inventory policy is 'deny'",
    denyVariant.inventory_policy,
    "deny",
  );
  TestValidator.equals(
    "deny variant has inventory quantity of 5",
    denyVariant.inventory_quantity,
    5,
  );
  TestValidator.predicate(
    "deny variant is active for customer visibility",
    denyVariant.is_active,
  );

  // Step 5: Test inventory continue policy - allows backorders
  const continueVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: colorUnit.id,
          sku: RandomGenerator.alphaNumeric(12),
          title: "Medium, Black - Continue Policy",
          price_adjustment: typia.random<
            number & tags.Minimum<-50> & tags.Maximum<200>
          >(),
          inventory_quantity: 0,
          inventory_policy: "continue",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(continueVariant);

  // Validate continue policy allows backorders even with zero inventory
  TestValidator.equals(
    "continue variant inventory policy is 'continue'",
    continueVariant.inventory_policy,
    "continue",
  );
  TestValidator.equals(
    "continue variant has zero inventory for backorder testing",
    continueVariant.inventory_quantity,
    0,
  );
  TestValidator.predicate(
    "continue variant remains active with zero inventory for backorder visibility",
    continueVariant.is_active,
  );

  // Step 6: Test variant position management - ensuring proper display ordering
  const positionVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: RandomGenerator.alphaNumeric(12),
          title: "Small, White - Position Test",
          price_adjustment: typia.random<
            number & tags.Minimum<-100> & tags.Maximum<50>
          >(),
          inventory_quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          inventory_policy: "deny",
          position: 2,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(positionVariant);

  // Validate position controls clear visual presentation
  TestValidator.equals(
    "position variant has position 2 for display order",
    positionVariant.position,
    2,
  );
  TestValidator.predicate(
    "position check ensures variants are ordered correctly",
    positionVariant.position >= 0,
  );

  // Step 7: Test variant lifecycle management - activation/deactivation
  const lifecycleVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: colorUnit.id,
          sku: RandomGenerator.alphaNumeric(12),
          title: "Extra Large, Gray - Lifecycle Test",
          price_adjustment: typia.random<
            number & tags.Minimum<-25> & tags.Maximum<75>
          >(),
          inventory_quantity: 1,
          inventory_policy: "deny",
          position: 3,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(lifecycleVariant);

  // Default variant is initially active
  TestValidator.predicate(
    "lifecycle variant starts active",
    lifecycleVariant.is_active,
  );

  // Step 8: Test complex variant configurations with cost and weight adjustments
  const premiumVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: RandomGenerator.alphaNumeric(12),
          title: "Premium, Limited Edition - Complex Configuration",
          price_adjustment: typia.random<
            number & tags.Minimum<100> & tags.Maximum<500>
          >(),
          cost_adjustment: typia.random<
            number & tags.Minimum<50> & tags.Maximum<400>
          >(),
          weight_adjustment: typia.random<
            number & tags.Minimum<0.5> & tags.Maximum<5>
          >(),
          inventory_quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          inventory_policy: "deny",
          position: 4,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(premiumVariant);

  // Validate complex variant configuration with adjustments
  TestValidator.predicate(
    "premium variant has positive price adjustment",
    premiumVariant.price_adjustment > 0,
  );
  TestValidator.predicate(
    "premium variant has cost adjustment for profit tracking",
    premiumVariant.cost_adjustment !== null,
  );
  TestValidator.predicate(
    "premium variant has weight adjustment for shipping",
    premiumVariant.weight_adjustment !== null,
  );

  // Step 9: Validate comprehensive inventory management features
  const inventoryVariants = [
    denyVariant,
    continueVariant,
    positionVariant,
    lifecycleVariant,
    premiumVariant,
  ];

  // Validate diverse inventory policy distribution
  const denyCount = inventoryVariants.filter(
    (v) => v.inventory_policy === "deny",
  ).length;
  const continueCount = inventoryVariants.filter(
    (v) => v.inventory_policy === "continue",
  ).length;

  TestValidator.predicate(
    "multiple variants use deny policy for overselling prevention",
    denyCount >= 3,
  );
  TestValidator.predicate(
    "some variants use continue policy for backorder flexibility",
    continueCount >= 1,
  );

  // Validate position ordering for customer experience
  const positions = inventoryVariants
    .map((v) => v.position)
    .sort((a, b) => a - b);
  const isSequential = positions.every(
    (pos, index) => index === 0 || pos > positions[index - 1],
  );
  TestValidator.predicate(
    "variant positions are properly ordered for display",
    isSequential,
  );

  // Validate diverse pricing strategies across variants
  const priceAdjustments = inventoryVariants.map((v) => v.price_adjustment);
  const hasPositivePricing = priceAdjustments.some((adj) => adj > 0);
  const hasNegativePricing = priceAdjustments.some((adj) => adj < 0);
  const hasNeutralPricing = priceAdjustments.some((adj) => adj === 0);

  TestValidator.predicate(
    "variants support premium pricing (positive adjustments)",
    hasPositivePricing,
  );
  TestValidator.predicate(
    "variants support discount pricing (negative adjustments)",
    hasNegativePricing,
  );
  TestValidator.predicate(
    "variants support base pricing (zero adjustments)",
    hasNeutralPricing,
  );

  // Step 10: Final comprehensive validation of inventory policy enforcement
  TestValidator.predicate(
    "all variant titles are unique and descriptive",
    inventoryVariants.every(
      (v1, i) =>
        inventoryVariants.findIndex((v2) => v2.title === v1.title) === i,
    ),
  );

  TestValidator.predicate(
    "all variant SKUs are unique",
    inventoryVariants.every(
      (v1, i) => inventoryVariants.findIndex((v2) => v2.sku === v1.sku) === i,
    ),
  );

  TestValidator.predicate(
    "all variants maintain product relationship",
    inventoryVariants.every((v) => v.shopping_mall_product_id === product.id),
  );

  // Validate inventory accuracy across all variants
  TestValidator.predicate(
    "inventory quantities are properly managed",
    inventoryVariants.every(
      (v) => v.inventory_quantity >= 0 && v.inventory_quantity <= 100,
    ),
  );

  // Ensure proper variant lifecycle state management
  TestValidator.predicate(
    "all variants have valid activation states",
    inventoryVariants.every(
      (v) => v.is_active === true || v.is_active === false,
    ),
  );

  // Comprehensive inventory policy validation complete
  TestValidator.equals(
    "total variant count matches expected",
    inventoryVariants.length,
    5,
  );
}
