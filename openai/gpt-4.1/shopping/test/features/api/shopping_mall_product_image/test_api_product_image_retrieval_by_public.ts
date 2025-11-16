import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test public retrieval of a specific product image after upload by seller.
 *
 * - Register a new seller account using random business info, required KYC,
 *   session context (href, referrer).
 * - Create a product as that seller with unique title/description/pricing,
 *   default to status 'published'.
 * - Upload an image for the new product as the seller using a unique random CDN
 *   uri, including alt_text, position, and label.
 * - As a public user (no auth) retrieve the just-uploaded product image using GET
 *   /shoppingMall/products/{productId}/images/{imageId}
 * - Assert that all returned metadata fields (cdn_uri, alt_text, position, label,
 *   and product association) match the uploaded content, and that deleted_at is
 *   null to confirm not soft-deleted.
 * - Also verify negative case: retrieve an image using a different productId
 *   (mismatched) or after simulating a soft-delete and confirm not found
 *   (TestValidator.error). [Negative scenario is a suggestion for extension,
 *   not required here].
 */
export async function test_api_product_image_retrieval_by_public(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(),
    registration_number: RandomGenerator.alphaNumeric(8),
    business_phone: RandomGenerator.mobile(),
    href: "https://seller.example.com/onboarding",
    referrer: "https://seller.example.com/",
    ip: null,
  } satisfies IShoppingMallSeller.ICreate;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerBody,
  });
  typia.assert(seller);

  // 2. Create product
  const productBody = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 10,
    }),
    default_price: 49900,
    business_status: "published",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // 3. Upload product image as seller
  const cdnUri =
    "https://cdn.example.com/product-img/" +
    RandomGenerator.alphaNumeric(16) +
    ".jpg";
  const imageBody = {
    cdn_uri: cdnUri,
    alt_text: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 10,
    }),
    position: 0,
    label: RandomGenerator.name(2),
    shopping_mall_product_id: product.id,
    shopping_mall_product_sku_id: null,
  } satisfies IShoppingMallProductImage.ICreate;
  const productImage =
    await api.functional.shoppingMall.seller.products.images.create(
      connection,
      {
        productId: product.id,
        body: imageBody,
      },
    );
  typia.assert(productImage);

  // 4. Retrieve image as public
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const image = await api.functional.shoppingMall.products.images.at(
    unauthConn,
    {
      productId: product.id,
      imageId: productImage.id,
    },
  );
  typia.assert(image);
  TestValidator.equals("cdn_uri matches", image.cdn_uri, imageBody.cdn_uri);
  TestValidator.equals("alt_text matches", image.alt_text, imageBody.alt_text);
  TestValidator.equals("position matches", image.position, imageBody.position);
  TestValidator.equals("label matches", image.label, imageBody.label);
  TestValidator.equals(
    "shopping_mall_product_id matches",
    image.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "shopping_mall_product_sku_id is null for product image",
    image.shopping_mall_product_sku_id,
    null,
  );
  TestValidator.equals(
    "deleted_at is null (not soft deleted)",
    image.deleted_at,
    null,
  );
}
