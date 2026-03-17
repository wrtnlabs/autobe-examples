import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_images_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test the primary success path where a customer (or any unauthenticated user) views an active product's details.
 */
export async function test_api_product_detail_page_active_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product with required fields
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Add product images with display order
  const image1 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { imageUrl: "https://example.com/image1.jpg" },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { imageUrl: "https://example.com/image2.jpg" },
      },
    );
  typia.assert(image2);
  // 4. Create product variants with SKU codes and option values
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "SKU-RED-LARGE",
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "Large" },
          ],
          price: 12000,
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "SKU-BLUE-SMALL",
          options: [
            { optionName: "Color", optionValue: "Blue" },
            { optionName: "Size", optionValue: "Small" },
          ],
          price: null,
        },
      },
    );
  typia.assert(variant2);
  // 5. Add inventory records to set stock quantities
  await generate_random_ecommerce_mall_seller_variants_inventory_create(
    sellerConnection,
    {
      params: { variantId: variant1.id },
      body: {
        quantity: 100,
        reason: "Initial stock",
      },
    },
  );
  await generate_random_ecommerce_mall_seller_variants_inventory_create(
    sellerConnection,
    {
      params: { variantId: variant2.id },
      body: {
        quantity: 50,
        reason: "Initial stock",
      },
    },
  );
  // 6. Call the public product detail endpoint (no authentication required)
  const productDetail: IEcommerceMallProduct =
    await api.functional.ecommerceMall.products.at(connection, {
      productId: product.id,
    });
  // 7. Verify response structure - typia.assert validates all types including timestamps, UUIDs, and number formats
  typia.assert(productDetail);
  // 8. Verify product identity
  TestValidator.equals("product id matches", productDetail.id, product.id);
  // 9. Verify images are ordered by display_order (first image should have lower displayOrder)
  TestValidator.predicate(
    "has at least 2 images",
    productDetail.images.length >= 2,
  );
  TestValidator.predicate(
    "images ordered by display order ascending",
    productDetail.images[0].displayOrder < productDetail.images[1].displayOrder,
  );
  // 10. Verify variants array contains expected variants with correct data
  TestValidator.predicate(
    "has at least 2 variants",
    productDetail.variants.length >= 2,
  );
  const foundVariant1 = productDetail.variants.find(
    (v) => v.id === variant1.id,
  );
  const foundVariant2 = productDetail.variants.find(
    (v) => v.id === variant2.id,
  );
  TestValidator.predicate(
    "variant1 found in response",
    foundVariant1 !== undefined,
  );
  TestValidator.predicate(
    "variant2 found in response",
    foundVariant2 !== undefined,
  );
  if (foundVariant1) {
    TestValidator.equals(
      "variant1 sku matches",
      foundVariant1.skuCode,
      variant1.skuCode,
    );
    TestValidator.equals(
      "variant1 price matches",
      foundVariant1.price,
      variant1.price,
    );
    TestValidator.predicate(
      "variant1 has positive stock",
      foundVariant1.stockQuantity === 100,
    );
    TestValidator.predicate(
      "variant1 has option values",
      foundVariant1.optionValues.length === 2,
    );
  }
  if (foundVariant2) {
    TestValidator.equals(
      "variant2 sku matches",
      foundVariant2.skuCode,
      variant2.skuCode,
    );
    TestValidator.equals(
      "variant2 price matches",
      foundVariant2.price,
      variant2.price,
    );
    TestValidator.predicate(
      "variant2 has positive stock",
      foundVariant2.stockQuantity === 50,
    );
  }
  // 11. Verify soft-deleted variants are NOT included in the response
  const hasDeletedVariants = productDetail.variants.some(
    (v: IEcommerceMallProductVariant) => v.deletedAt !== null,
  );
  TestValidator.predicate(
    "no deleted variants in response",
    !hasDeletedVariants,
  );
  // 12. Verify seller and category info exist (typia.assert already validated structure)
  TestValidator.predicate(
    "seller info exists",
    productDetail.seller.id !== undefined,
  );
  TestValidator.predicate(
    "category info exists",
    productDetail.category.id !== undefined,
  );
  // 13. Verify review statistics exist (typia.assert validated types)
  TestValidator.predicate(
    "averageRating exists",
    productDetail.averageRating !== undefined,
  );
  TestValidator.predicate(
    "reviewCount exists",
    productDetail.reviewCount !== undefined,
  );
}
