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
 * Verify creation of a product image with optional alt_text explicitly set to
 * null.
 *
 * Business goal:
 *
 * - Ensure that the product-image creation API accepts null for the optional
 *   accessibility field alt_text and persists it as null instead of
 *   substituting an empty string or auto-generated text.
 * - Confirm that image_uri and display_order are correctly stored and that the
 *   created image is associated with the expected parent product.
 *
 * Scenario steps:
 *
 * 1. Register a new seller account using POST /auth/seller/join to obtain an
 *    authenticated seller context (token is handled by SDK).
 * 2. With this seller context, create a product via POST
 *    /shoppingMall/seller/products using IShoppingMallProduct.ICreate.
 * 3. Create a new image for that product via POST
 *    /shoppingMall/products/{productId}/images using
 *    IShoppingMallProductImage.ICreate where:
 *
 *    - Image_uri is a valid HTTPS URI.
 *    - Alt_text is explicitly null.
 *    - Display_order is a valid non-negative int32, e.g., 0.
 * 4. Assert the response is a valid IShoppingMallProductImage and that:
 *
 *    - Shopping_mall_product_id equals the created product.id.
 *    - Image_uri equals the input image_uri.
 *    - Display_order equals the input display_order.
 *    - Alt_text is null (not an empty string or any other value).
 *
 * Notes:
 *
 * - No GET-by-id endpoint for images is provided in the SDK list, so the test
 *   validates state using only the create response body.
 */
export async function test_api_product_image_creation_with_optional_alt_text_null(
  connection: api.IConnection,
) {
  // 1. Register a new seller (auth.seller.join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://shoppingmall.example.com/seller/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(seller);

  // 2. Create a product owned by this seller
  const productBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    summary: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 10,
    }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.example.com/images/primary.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 3. Create a product image with alt_text explicitly null
  const imageUri = "https://cdn.shoppingmall.example.com/images/gallery-1.jpg";

  const imageBody = {
    image_uri: imageUri,
    alt_text: null,
    display_order: 0,
  } satisfies IShoppingMallProductImage.ICreate;

  const createdImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: product.id,
      body: imageBody,
    });
  typia.assert(createdImage);

  // 4. Business assertions on the created image
  TestValidator.equals(
    "product image should be linked to the correct product",
    createdImage.shopping_mall_product_id,
    product.id,
  );

  TestValidator.equals(
    "product image should echo the input image_uri",
    createdImage.image_uri,
    imageUri,
  );

  TestValidator.equals(
    "product image should echo the input display_order",
    createdImage.display_order,
    imageBody.display_order,
  );

  TestValidator.equals(
    "product image alt_text should be null when created with alt_text: null",
    createdImage.alt_text,
    null,
  );
}
