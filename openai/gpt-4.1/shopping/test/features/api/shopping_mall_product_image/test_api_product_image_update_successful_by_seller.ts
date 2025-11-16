import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates that a seller can successfully update a product image: sellers can
 * update only mutable fields (label, alt_text, position), and cannot change
 * immutable fields like product association or cdn_uri.
 *
 * Workflow:
 *
 * 1. Seller registration (join)
 * 2. Create an image for a product (simulate with a random UUID for product)
 * 3. Update the image: change position, alt_text, and label
 * 4. Assert that immutable fields did not change and writable fields are updated.
 * 5. Check that updated_at is properly refreshed.
 */
export async function test_api_product_image_update_successful_by_seller(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(),
    registration_number: RandomGenerator.alphaNumeric(12),
    business_phone: RandomGenerator.mobile(),
    href: "https://mall.wrtn.test/shopseller/signup",
    referrer: "https://mall.wrtn.test/",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.ICreate;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerCreate,
  });
  typia.assert(seller);
  TestValidator.equals("seller is created", seller.email, sellerCreate.email);
  // 2. Create product image
  const productId = typia.random<string & tags.Format<"uuid">>();
  const origImageBody = {
    cdn_uri:
      "https://cdn.mall.wrtn.test/assets/" + RandomGenerator.alphaNumeric(24),
    position: typia.random<number & tags.Type<"int32">>(),
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    label: RandomGenerator.name(2),
    shopping_mall_product_id: productId,
    shopping_mall_product_sku_id: null,
  } satisfies IShoppingMallProductImage.ICreate;
  const image = await api.functional.shoppingMall.seller.products.images.create(
    connection,
    { productId, body: origImageBody },
  );
  typia.assert(image);
  TestValidator.equals(
    "image created at expected position",
    image.position,
    origImageBody.position,
  );
  TestValidator.equals(
    "image's original alt_text",
    image.alt_text,
    origImageBody.alt_text,
  );
  TestValidator.equals("image's label", image.label, origImageBody.label);
  TestValidator.equals(
    "image's product id",
    image.shopping_mall_product_id,
    productId,
  );
  TestValidator.equals("image's cdn_uri", image.cdn_uri, origImageBody.cdn_uri);
  // 3. Update the image: change position, alt_text and label
  const updateBody = {
    position: origImageBody.position + 1,
    alt_text: RandomGenerator.paragraph({ sentences: 3 }),
    label: RandomGenerator.name(3),
  } satisfies IShoppingMallProductImage.IUpdate;
  // capture existing values for comparison
  const prevUpdatedAt = image.updated_at;
  const updated =
    await api.functional.shoppingMall.seller.products.images.update(
      connection,
      { productId, imageId: image.id, body: updateBody },
    );
  typia.assert(updated);
  // 4. Assert updated fields match
  TestValidator.equals(
    "updated position is reflected",
    updated.position,
    updateBody.position,
  );
  TestValidator.equals(
    "updated alt_text is reflected",
    updated.alt_text,
    updateBody.alt_text,
  );
  TestValidator.equals(
    "updated label is reflected",
    updated.label,
    updateBody.label,
  );
  // 5. Assert that immutable fields have not changed
  TestValidator.equals(
    "shopping_mall_product_id is unchanged",
    updated.shopping_mall_product_id,
    image.shopping_mall_product_id,
  );
  TestValidator.equals("cdn_uri is unchanged", updated.cdn_uri, image.cdn_uri);
  TestValidator.equals("image id is unchanged", updated.id, image.id);
  // 6. updated_at should be refreshed (string comparison)
  TestValidator.notEquals(
    "updated_at field is refreshed",
    updated.updated_at,
    prevUpdatedAt,
  );
  // 7. created_at is not changed
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    image.created_at,
  );
}
