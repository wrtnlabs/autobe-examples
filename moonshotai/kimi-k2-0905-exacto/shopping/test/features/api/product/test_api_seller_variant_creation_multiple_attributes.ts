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
 * Test variant creation with multiple product attributes such as size and color
 * combinations. Validates that sellers can create complex variants representing
 * different product configurations while maintaining unique SKU identifiers,
 * appropriate pricing adjustments for premium attributes, and proper inventory
 * tracking across all variant combinations. Ensures variant titles accurately
 * describe selected options for customer clarity during purchase decisions.
 */
export async function test_api_seller_variant_creation_multiple_attributes(
  connection: api.IConnection,
) {
  // Step 1: Register seller account for multi-attribute variant creation
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphaNumeric(10),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "corporation",
        "llc",
        "partnership",
        "sole_proprietorship",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create base product to support multiple variant attributes
  const productCode = `PROD-${RandomGenerator.alphaNumeric(8)}`;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: productCode,
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<5>>(),
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/products/create",
        referrer: "https://example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Set up size unit configuration for variant attribute definition
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

  // Step 4: Set up color unit configuration for complete attribute combination
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

  // Step 5: Create size/color variant combinations with unique SKUs and pricing
  const variants: IShoppingMallProductVariant[] = [];

  // Create Small/Blue variant
  const smallBlueSKU = `${productCode}-SM-BLUE`;
  const smallBlueVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: smallBlueSKU,
          title: "Small, Blue",
          price_adjustment: 0,
          inventory_quantity: 50,
          inventory_policy: "deny",
          position: 0,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(smallBlueVariant);
  variants.push(smallBlueVariant);

  // Create Medium/Red variant with premium pricing
  const mediumRedSKU = `${productCode}-MD-RED`;
  const mediumRedVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: colorUnit.id,
          sku: mediumRedSKU,
          title: "Medium, Red",
          price_adjustment: 5.0, // Premium color adds $5
          inventory_quantity: 30,
          inventory_policy: "deny",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(mediumRedVariant);
  variants.push(mediumRedVariant);

  // Create Large/Green variant with backorder capability
  const largeGreenSKU = `${productCode}-LG-GREEN`;
  const largeGreenVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: largeGreenSKU,
          title: "Large, Green",
          price_adjustment: 10.0, // Large size premium
          inventory_quantity: 0, // Out of stock
          inventory_policy: "continue", // Allow backorders
          position: 2,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(largeGreenVariant);
  variants.push(largeGreenVariant);

  // Validate variant creation results
  TestValidator.equals("variant count should be 3", variants.length, 3);

  // Validate SKU uniqueness and format
  TestValidator.predicate(
    "all SKUs should be unique",
    new Set(variants.map((v) => v.sku)).size === variants.length,
  );

  // Validate variant titles describe options clearly
  TestValidator.predicate(
    "first variant title should describe size and color",
    variants[0].title.includes("Small") && variants[0].title.includes("Blue"),
  );
  TestValidator.predicate(
    "second variant title should describe size and color",
    variants[1].title.includes("Medium") && variants[1].title.includes("Red"),
  );
  TestValidator.predicate(
    "third variant title should describe size and color",
    variants[2].title.includes("Large") && variants[2].title.includes("Green"),
  );

  // Validate pricing adjustments for premium attributes
  TestValidator.equals(
    "small blue variant has no price adjustment",
    variants[0].price_adjustment,
    0,
  );
  TestValidator.equals(
    "medium red variant has premium pricing",
    variants[1].price_adjustment,
    5.0,
  );
  TestValidator.equals(
    "large green variant has size premium",
    variants[2].price_adjustment,
    10.0,
  );

  // Validate inventory policies across variants
  TestValidator.equals(
    "small blue inventory policy",
    variants[0].inventory_policy,
    "deny",
  );
  TestValidator.equals(
    "medium red inventory policy",
    variants[1].inventory_policy,
    "deny",
  );
  TestValidator.equals(
    "large green inventory policy",
    variants[2].inventory_policy,
    "continue",
  );

  // Validate inventory quantities
  TestValidator.equals(
    "small blue inventory quantity",
    variants[0].inventory_quantity,
    50,
  );
  TestValidator.equals(
    "medium red inventory quantity",
    variants[1].inventory_quantity,
    30,
  );
  TestValidator.equals(
    "large green inventory quantity",
    variants[2].inventory_quantity,
    0,
  );

  // Validate variant positions for display ordering
  TestValidator.equals("small blue position", variants[0].position, 0);
  TestValidator.equals("medium red position", variants[1].position, 1);
  TestValidator.equals("large green position", variants[2].position, 2);

  // Validate all variants are active
  TestValidator.predicate(
    "all variants should be active",
    variants.every((v) => v.is_active === true),
  );

  // Validate variant relationships
  TestValidator.predicate(
    "all variants belong to same product",
    variants.every((v) => v.shopping_mall_product_id === product.id),
  );

  // Validate SKU format includes product code
  TestValidator.predicate(
    "all SKUs include product code prefix",
    variants.every((v) => v.sku.startsWith(productCode)),
  );
}
