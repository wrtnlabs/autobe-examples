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

export async function test_api_seller_variant_image_customization(
  connection: api.IConnection,
) {
  // Step 1: Register seller account
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

  // Step 2: Create base product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        price: 299.99,
        condition: "new",
        weight: 2.5,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        seo_title: RandomGenerator.name(2),
        seo_description: RandomGenerator.paragraph({ sentences: 5 }),
        tags: "electronics,gadget,trendy",
        href: "https://shoppingmall.com/seller-dashboard/products/create",
        referrer: "https://shoppingmall.com/seller-dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create product units for variant configuration
  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Color",
        type: "color",
        display_style: "swatches",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(colorUnit);

  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Size",
        type: "size",
        display_style: "buttons",
        is_required: true,
        is_multiple: false,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(sizeUnit);

  // Step 4: Create variants with distinct images
  const variants = [
    {
      unitId: colorUnit.id,
      title: "Black, Large",
      priceAdjustment: 0,
      inventoryQuantity: 50,
      imageUrl:
        "https://cdn.images.shoppingmall.com/products/black-large-variant-001.jpg",
      sku: `${product.sku}-BLK-L`,
      position: 0,
    },
    {
      unitId: colorUnit.id,
      title: "Blue, Medium",
      priceAdjustment: 10,
      inventoryQuantity: 30,
      imageUrl:
        "https://cdn.images.shoppingmall.com/products/blue-medium-variant-002.jpg",
      sku: `${product.sku}-BLU-M`,
      position: 1,
    },
    {
      unitId: colorUnit.id,
      title: "Red, Small",
      priceAdjustment: -5,
      inventoryQuantity: 20,
      imageUrl:
        "https://cdn.images.shoppingmall.com/products/red-small-variant-003.jpg",
      sku: `${product.sku}-RED-S`,
      position: 2,
    },
  ];

  // Create variants with distinct variant-specific images
  const createdVariants = await ArrayUtil.asyncMap(
    variants,
    async (variant) => {
      const createdVariant =
        await api.functional.shoppingMall.seller.products.variants.create(
          connection,
          {
            productCode: product.sku,
            body: {
              shopping_mall_product_id: product.id,
              shopping_mall_product_unit_id: variant.unitId,
              sku: variant.sku,
              title: variant.title,
              price_adjustment: variant.priceAdjustment,
              inventory_quantity: variant.inventoryQuantity,
              inventory_policy: "deny",
              position: variant.position,
              is_active: true,
              image: variant.imageUrl,
            } satisfies IShoppingMallProductVariant.ICreate,
          },
        );
      typia.assert(createdVariant);
      return createdVariant;
    },
  );

  // Step 5: Validate that each variant has distinct images
  TestValidator.equals(
    "Black large variant image",
    createdVariants[0].image,
    variants[0].imageUrl,
  );
  TestValidator.equals(
    "Blue medium variant image",
    createdVariants[1].image,
    variants[1].imageUrl,
  );
  TestValidator.equals(
    "Red small variant image",
    createdVariants[2].image,
    variants[2].imageUrl,
  );

  // Step 6: Validate images are actually different
  const [blackVariant, blueVariant, redVariant] = createdVariants;

  TestValidator.predicate(
    "Variant images are different",
    blackVariant.image !== null &&
      blackVariant.image !== undefined &&
      blueVariant.image !== null &&
      blueVariant.image !== undefined &&
      redVariant.image !== null &&
      redVariant.image !== undefined &&
      blackVariant.image !== blueVariant.image &&
      blueVariant.image !== redVariant.image &&
      blackVariant.image !== redVariant.image,
  );

  // Step 7: Validate SKU uniqueness across variants
  TestValidator.notEquals(
    "SKU variants are unique",
    blackVariant.sku,
    blueVariant.sku,
  );
  TestValidator.notEquals(
    "SKU variants are unique",
    blueVariant.sku,
    redVariant.sku,
  );
  TestValidator.notEquals(
    "SKU variants are unique",
    blackVariant.sku,
    redVariant.sku,
  );

  // Step 8: Validate variant pricing adjustments
  TestValidator.equals(
    "Black large price adjustment",
    blackVariant.price_adjustment,
    0,
  );
  TestValidator.equals(
    "Blue medium price adjustment",
    blueVariant.price_adjustment,
    10,
  );
  TestValidator.equals(
    "Red small price adjustment",
    redVariant.price_adjustment,
    -5,
  );

  // Step 9: Validate variant titles reflect proper differentiation
  TestValidator.equals("Black large title", blackVariant.title, "Black, Large");
  TestValidator.equals("Blue medium title", blueVariant.title, "Blue, Medium");
  TestValidator.equals("Red small title", redVariant.title, "Red, Small");
}
