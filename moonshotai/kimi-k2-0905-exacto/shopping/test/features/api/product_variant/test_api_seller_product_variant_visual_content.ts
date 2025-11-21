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
 * Test variant-specific image management including product photography updates,
 * variant appearance changes, and promotional visual content. Validates
 * variant-specific image URL updates showcasing precise configuration
 * attributes like specific colors, patterns, or feature combinations. Tests
 * image quality standards compliance and variant visualization requirements for
 * customer purchasing confidence.
 */
export async function test_api_seller_product_variant_visual_content(
  connection: api.IConnection,
) {
  // 1. Seller authentication and account creation
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphabets(10),
      tax_id: RandomGenerator.alphabets(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Create a product for visual variant management
  const productCreateBody = {
    sku: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
    }),
    price: typia.random<number & tags.Minimum<10>>(),
    condition: "new",
    weight: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
    >(),
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    variants: [],
    images: [],
    href: "https://test.seller.dashboard",
    referrer: "https://test.marketplace",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productCreateBody,
    },
  );
  typia.assert(product);

  // 3. Create product unit for variant configuration
  const unit = await api.functional.shoppingMall.seller.products.units.create(
    connection,
    {
      productCode: product.sku,
      body: {
        name: "Color",
        type: "color",
        display_style: "swatches",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    },
  );
  typia.assert(unit);

  // 4. Create product variant with initial visual content
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: unit.id,
          sku: product.sku + "-BLUE",
          title: "Premium Blue Edition",
          price_adjustment: 0,
          inventory_quantity: 50,
          inventory_policy: "deny",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);

  // 5. Update variant with comprehensive visual content
  const imageUrl = typia.random<string & tags.Format<"uri">>();
  const updateData = {
    title: "Premium Blue Edition - Enhanced Visuals",
    price_adjustment: 10,
    image: imageUrl,
    inventory_quantity: 75,
    position: 1,
    is_active: true,
  } satisfies IShoppingMallProductVariant.IUpdate;

  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      connection,
      {
        productCode: product.sku,
        variantCode: variant.sku,
        body: updateData,
      },
    );
  typia.assert(updatedVariant);

  // 6. Validate visual content updates
  TestValidator.equals(
    "variant title updated correctly",
    updatedVariant.title,
    updateData.title,
  );
  TestValidator.equals(
    "price adjustment applied",
    updatedVariant.price_adjustment,
    updateData.price_adjustment,
  );
  TestValidator.equals(
    "image URL updated",
    updatedVariant.image,
    updateData.image,
  );
  TestValidator.equals(
    "inventory quantity updated",
    updatedVariant.inventory_quantity,
    updateData.inventory_quantity,
  );
  TestValidator.equals(
    "position maintained",
    updatedVariant.position,
    updateData.position,
  );
  TestValidator.equals(
    "active status maintained",
    updatedVariant.is_active,
    updateData.is_active,
  );

  // 7. Test variant-specific promotional visual content
  const promoUpdate = {
    title: "Premium Blue Edition - Holiday Special",
    image: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallProductVariant.IUpdate;

  const promoVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      connection,
      {
        productCode: product.sku,
        variantCode: updatedVariant.sku,
        body: promoUpdate,
      },
    );
  typia.assert(promoVariant);

  // 8. Validate promotional visual updates
  TestValidator.equals(
    "promotional title updated",
    promoVariant.title,
    promoUpdate.title,
  );
  TestValidator.equals(
    "promotional image updated",
    promoVariant.image,
    promoUpdate.image,
  );

  // 9. Test image removal (null scenario)
  const removeImageUpdate = {
    image: null as null | undefined,
  } satisfies IShoppingMallProductVariant.IUpdate;

  const variantWithoutImage =
    await api.functional.shoppingMall.seller.products.variants.update(
      connection,
      {
        productCode: product.sku,
        variantCode: promoVariant.sku,
        body: removeImageUpdate,
      },
    );
  typia.assert(variantWithoutImage);

  TestValidator.equals(
    "image successfully removed",
    variantWithoutImage.image,
    null,
  );

  // 10. Final validation of complete variant visual content lifecycle
  TestValidator.predicate(
    "variant ID consistency maintained",
    variantWithoutImage.id === variant.id,
  );
  TestValidator.predicate(
    "variant SKU consistency maintained",
    variantWithoutImage.sku === variant.sku,
  );
  TestValidator.predicate(
    "product relationship maintained",
    variantWithoutImage.shopping_mall_product_id === product.id,
  );
  TestValidator.predicate(
    "unit relationship maintained",
    variantWithoutImage.shopping_mall_product_unit_id === unit.id,
  );
}
