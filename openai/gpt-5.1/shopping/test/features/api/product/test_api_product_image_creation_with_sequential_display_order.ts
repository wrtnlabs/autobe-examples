import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate creation of sequential product images and uniqueness of
 * display_order per product.
 *
 * Business goal:
 *
 * - Ensure that a seller can attach multiple gallery images to a single product
 *   with distinct display_order values so that they can control the visual
 *   order of images on product detail pages.
 * - Confirm that the backend enforces a unique constraint on
 *   (shopping_mall_product_id, display_order) via the public API: attempts to
 *   reuse a display_order value for the same product must fail.
 *
 * End-to-end steps:
 *
 * 1. Seller self-registers using /auth/seller/join and becomes authenticated.
 * 2. Authenticated seller creates a product using /shoppingMall/seller/products.
 * 3. Create first product image for the new product with display_order = 0.
 * 4. Create second product image for the same product with display_order = 1.
 * 5. Attempt to create a third image for the same product with display_order = 0
 *    again and assert that the API call fails.
 * 6. Validate that:
 *
 *    - Successful image creations conform to IShoppingMallProductImage.
 *    - Images have distinct id values.
 *    - Each image.shopping_mall_product_id equals the product.id.
 *    - Display_order values are exactly 0 and 1 for the first two images.
 */
export async function test_api_product_image_creation_with_sequential_display_order(
  connection: api.IConnection,
) {
  // 1. Seller self-registration (join) to obtain authenticated seller context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(seller);

  // 2. Create a product owned by the authenticated seller
  const productBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    summary: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    brand: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 10 }),
    model_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 10,
    }),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 3. Create first product image with display_order = 0
  const firstImageBody = {
    image_uri: typia.random<string & tags.Format<"uri">>(),
    alt_text: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    display_order: 0,
  } satisfies IShoppingMallProductImage.ICreate;

  const firstImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: product.id,
      body: firstImageBody,
    });
  typia.assert(firstImage);

  // 4. Create second product image with display_order = 1
  const secondImageBody = {
    image_uri: typia.random<string & tags.Format<"uri">>(),
    alt_text: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    display_order: 1,
  } satisfies IShoppingMallProductImage.ICreate;

  const secondImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: product.id,
      body: secondImageBody,
    });
  typia.assert(secondImage);

  // 5. Attempt to create a third image with a duplicate display_order = 0
  const duplicateImageBody = {
    image_uri: typia.random<string & tags.Format<"uri">>(),
    alt_text: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    display_order: 0,
  } satisfies IShoppingMallProductImage.ICreate;

  await TestValidator.error(
    "duplicate display_order for same product must fail",
    async () => {
      await api.functional.shoppingMall.products.images.create(connection, {
        productId: product.id,
        body: duplicateImageBody,
      });
    },
  );

  // 6. Validate successful creations
  TestValidator.notEquals(
    "first and second image ids must differ",
    firstImage.id,
    secondImage.id,
  );

  TestValidator.equals(
    "first image product id must match product.id",
    firstImage.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "second image product id must match product.id",
    secondImage.shopping_mall_product_id,
    product.id,
  );

  TestValidator.equals(
    "first image display_order must be 0",
    firstImage.display_order,
    0,
  );
  TestValidator.equals(
    "second image display_order must be 1",
    secondImage.display_order,
    1,
  );
}
