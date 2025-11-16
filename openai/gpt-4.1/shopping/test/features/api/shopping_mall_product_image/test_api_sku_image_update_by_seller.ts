import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test updating SKU-level image metadata as a seller, enforcing
 * updatable/protected field constraints and business rules.
 *
 * Steps:
 *
 * 1. Seller account registration (auth.seller.join).
 * 2. Upload SKU-level image (shoppingMall.seller.products.skus.images.create) for
 *    random product/sku IDs.
 * 3. Update allowed fields: position, alt_text, label -- verify OK.
 * 4. Register another seller and verify that unauthorized update by other seller
 *    fails.
 * 5. Validate successful update for allowed fields and correct enforcement of
 *    business rules (protected fields cannot be updated by type system,
 *    uniqueness cannot be checked in this test as only one image is created for
 *    this SKU).
 */
export async function test_api_sku_image_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Register seller
  const seller_input = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://seller.example.com/register",
    referrer: "https://seller.example.com/",
    ip: undefined,
  } satisfies IShoppingMallSeller.ICreate;
  const seller = await api.functional.auth.seller.join(connection, {
    body: seller_input,
  });
  typia.assert(seller);

  // 2. Upload SKU-level image
  const productId = typia.random<string & tags.Format<"uuid">>();
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const image_create_body = {
    cdn_uri:
      "https://cdn.example.com/image/" + RandomGenerator.alphaNumeric(16),
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    position: 1,
    label: RandomGenerator.name(2),
    shopping_mall_product_sku_id: skuId,
    shopping_mall_product_id: undefined,
  } satisfies IShoppingMallProductImage.ICreate;
  const image =
    await api.functional.shoppingMall.seller.products.skus.images.create(
      connection,
      {
        productId,
        skuId,
        body: image_create_body,
      },
    );
  typia.assert(image);
  TestValidator.equals(
    "image association correct",
    image.shopping_mall_product_sku_id,
    skuId,
  );
  TestValidator.equals(
    "image association correct",
    image.shopping_mall_product_id,
    undefined,
  );

  // 3. Update allowed fields
  const new_alt_text = RandomGenerator.paragraph({ sentences: 2 });
  const new_label = RandomGenerator.name(3);
  const new_position = 2;
  const updated =
    await api.functional.shoppingMall.seller.products.skus.images.update(
      connection,
      {
        productId,
        skuId,
        imageId: image.id,
        body: {
          alt_text: new_alt_text,
          label: new_label,
          position: new_position,
        } satisfies IShoppingMallProductImage.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("alt_text updated", updated.alt_text, new_alt_text);
  TestValidator.equals("label updated", updated.label, new_label);
  TestValidator.equals("position updated", updated.position, new_position);
  TestValidator.equals("cdn_uri unchanged", updated.cdn_uri, image.cdn_uri);

  // 4. Register another seller and check permission error
  const otherSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      business_name: RandomGenerator.name(),
      registration_number: RandomGenerator.alphaNumeric(10),
      business_phone: RandomGenerator.mobile(),
      href: "https://seller2.example.com/register",
      referrer: "https://seller2.example.com/",
      ip: undefined,
    },
  });
  typia.assert(otherSeller);
  await TestValidator.error(
    "unauthorized seller cannot update image",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.images.update(
        connection,
        {
          productId,
          skuId,
          imageId: image.id,
          body: {
            alt_text: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallProductImage.IUpdate,
        },
      );
    },
  );
}
