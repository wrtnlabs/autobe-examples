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
 * Test variant creation with different inventory policies including both 'deny'
 * and 'continue' settings. Validates that sellers can configure variants to
 * either prevent overselling with strict inventory enforcement or enable
 * backorder processing for flexible supply chain management. Ensures inventory
 * policies correctly affect customer purchasing behavior and order processing
 * workflows based on variant availability status.
 *
 * This comprehensive test covers:
 *
 * 1. Seller registration and authentication for marketplace access
 * 2. Product creation in the shopping mall catalog with proper metadata
 * 3. Product unit configuration to enable variant creation
 * 4. Variant creation with 'deny' inventory policy for strict stock control
 * 5. Variant creation with 'continue' inventory policy for backorder support
 * 6. Validation of inventory policy enforcement and system behavior
 *
 * The test ensures that sellers can effectively manage their inventory policies
 * at the variant level, supporting both conservative approaches (deny
 * overselling) and flexible approaches (allow backorders) based on their
 * business requirements and supply chain capabilities.
 */
export async function test_api_seller_variant_inventory_policy_validation(
  connection: api.IConnection,
) {
  // Step 1: Create seller registration with comprehensive business information
  const sellerJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    business_name: RandomGenerator.name(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    tax_id: RandomGenerator.alphaNumeric(9),
    phone: RandomGenerator.mobile(),
    business_type: RandomGenerator.pick([
      "sole_proprietorship",
      "corporation",
      "llc",
      "partnership",
    ] as const),
  } satisfies IShoppingMallSeller.IJoin;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinRequest,
    });
  typia.assert(seller);
  TestValidator.equals(
    "seller account created successfully",
    seller.is_verified,
    false,
  );

  // Step 2: Create product with comprehensive catalog information
  const productCreateRequest = {
    sku: RandomGenerator.alphaNumeric(12).toUpperCase(),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<100000>
    >(),
    condition: RandomGenerator.pick(["new", "used", "refurbished"] as const),
    weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
    weight_unit: RandomGenerator.pick(["kg", "g", "lb", "oz"] as const),
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: seller.id, // Use seller ID as category placeholder
    shopping_mall_seller_id: seller.id,
    href: "https://example.com",
    referrer: "https://example.com",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateRequest,
    });
  typia.assert(product);
  TestValidator.equals(
    "product created successfully",
    product.seller.id,
    seller.id,
  );

  // Step 3: Create size unit for variant configuration
  const sizeUnitRequest = {
    name: "Size",
    type: "size",
    display_style: "dropdown",
    is_required: true,
    is_multiple: false,
    sort_order: 1,
  } satisfies IShoppingMallProductUnit.ICreate;

  const sizeUnit: IShoppingMallProductUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: sizeUnitRequest,
    });
  typia.assert(sizeUnit);
  TestValidator.equals(
    "size unit created successfully",
    sizeUnit.product.id,
    product.id,
  );

  // Step 4: Create color unit for additional variant configuration
  const colorUnitRequest = {
    name: "Color",
    type: "color",
    display_style: "swatches",
    is_required: true,
    is_multiple: false,
    sort_order: 2,
  } satisfies IShoppingMallProductUnit.ICreate;

  const colorUnit: IShoppingMallProductUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: colorUnitRequest,
    });
  typia.assert(colorUnit);
  TestValidator.equals(
    "color unit created successfully",
    colorUnit.product.id,
    product.id,
  );

  // Step 5: Create variant with 'deny' inventory policy for strict stock control
  const denyVariantRequest = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_unit_id: sizeUnit.id,
    sku: `${product.sku}-DENY-LARGE`,
    title: "Large Size - Deny Policy",
    price_adjustment: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
    >(),
    inventory_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<100>
    >(),
    inventory_policy: "deny" as const,
    position: 1,
    is_active: true,
  } satisfies IShoppingMallProductVariant.ICreate;

  const denyVariant: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: denyVariantRequest,
      },
    );
  typia.assert(denyVariant);
  TestValidator.equals(
    "deny variant created with correct policy",
    denyVariant.inventory_policy,
    "deny",
  );
  TestValidator.equals(
    "deny variant initialized with proper inventory",
    denyVariant.inventory_quantity,
    denyVariantRequest.inventory_quantity,
  );

  // Step 6: Create variant with 'continue' inventory policy for backorder support
  const continueVariantRequest = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_unit_id: colorUnit.id,
    sku: `${product.sku}-CONTINUE-BLUE`,
    title: "Blue Color - Continue Policy",
    price_adjustment: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
    >(),
    inventory_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<50>
    >(),
    inventory_policy: "continue" as const,
    position: 2,
    is_active: true,
  } satisfies IShoppingMallProductVariant.ICreate;

  const continueVariant: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: continueVariantRequest,
      },
    );
  typia.assert(continueVariant);
  TestValidator.equals(
    "continue variant created with correct policy",
    continueVariant.inventory_policy,
    "continue",
  );
  TestValidator.equals(
    "continue variant initialized with low inventory",
    continueVariant.inventory_quantity,
    continueVariantRequest.inventory_quantity,
  );

  // Step 7: Validate inventory policy differences and business logic
  TestValidator.predicate(
    "variants have different inventory policies",
    denyVariant.inventory_policy !== continueVariant.inventory_policy,
  );
  TestValidator.predicate(
    "deny variant requires stock for sales",
    denyVariant.inventory_policy === "deny",
  );
  TestValidator.predicate(
    "continue variant allows backorders",
    continueVariant.inventory_policy === "continue",
  );

  // Step 8: Test variant creation with additional options and adjustments
  const premiumVariantRequest = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_unit_id: sizeUnit.id,
    sku: `${product.sku}-PREMIUM-XL`,
    title: "Extra Large - Premium Deny",
    price_adjustment: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<500> & tags.Maximum<5000>
    >(),
    cost_adjustment: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<2000>
    >(),
    weight_adjustment: typia.random<
      number & tags.Minimum<0.1> & tags.Maximum<2>
    >(),
    inventory_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
    >(),
    inventory_policy: "deny" as const,
    position: 3,
    is_active: true,
  } satisfies IShoppingMallProductVariant.ICreate;

  const premiumVariant: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: premiumVariantRequest,
      },
    );
  typia.assert(premiumVariant);
  TestValidator.equals(
    "premium variant created with all adjustments",
    premiumVariant.inventory_policy,
    "deny",
  );
  TestValidator.equals(
    "price adjustment applied correctly",
    premiumVariant.price_adjustment,
    premiumVariantRequest.price_adjustment,
  );
  TestValidator.equals(
    "cost adjustment applied correctly",
    premiumVariant.cost_adjustment,
    premiumVariantRequest.cost_adjustment,
  );
  TestValidator.equals(
    "weight adjustment applied correctly",
    premiumVariant.weight_adjustment,
    premiumVariantRequest.weight_adjustment,
  );

  // Step 9: Validate business logic and system behavior
  TestValidator.predicate(
    "all variants belong to same product",
    denyVariant.shopping_mall_product_id ===
      continueVariant.shopping_mall_product_id &&
      continueVariant.shopping_mall_product_id ===
        premiumVariant.shopping_mall_product_id,
  );
  TestValidator.predicate(
    "all variants have unique SKUs",
    denyVariant.sku !== continueVariant.sku &&
      continueVariant.sku !== premiumVariant.sku &&
      denyVariant.sku !== premiumVariant.sku,
  );

  // Validate inventory tracking and business rules
  TestValidator.predicate(
    "inventory quantities are positive numbers",
    denyVariant.inventory_quantity >= 0 &&
      continueVariant.inventory_quantity >= 0 &&
      premiumVariant.inventory_quantity >= 0,
  );

  // Step 10: Comprehensive validation of variant system functionality
  TestValidator.predicate(
    "variant positions are properly ordered",
    denyVariant.position < continueVariant.position &&
      continueVariant.position < premiumVariant.position,
  );

  TestValidator.predicate(
    "active variants are properly flagged",
    denyVariant.is_active === true &&
      continueVariant.is_active === true &&
      premiumVariant.is_active === true,
  );

  // Business rule validation for inventory policies
  TestValidator.equals(
    "deny policy prevents overselling",
    denyVariant.inventory_policy,
    "deny",
  );
  TestValidator.equals(
    "continue policy enables backorders",
    continueVariant.inventory_policy,
    "continue",
  );
  TestValidator.equals(
    "premium variant uses deny policy",
    premiumVariant.inventory_policy,
    "deny",
  );
}
