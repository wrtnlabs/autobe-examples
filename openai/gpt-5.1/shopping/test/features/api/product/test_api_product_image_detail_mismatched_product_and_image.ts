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

export async function test_api_product_image_detail_mismatched_product_and_image(
  connection: api.IConnection,
) {
  // 1. Register a seller and establish authenticated context.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const authorizedSeller = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(authorizedSeller);

  // 2. Create two distinct products owned by this seller: productA and productB.
  const productABody = {
    code: `CODE-A-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productA = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productABody,
    },
  );
  typia.assert<IShoppingMallProduct>(productA);

  const productBBody = {
    code: `CODE-B-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productB = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productBBody,
    },
  );
  typia.assert<IShoppingMallProduct>(productB);

  // 3. Create imageA under productA.
  const imageABody = {
    image_uri: typia.random<string & tags.Format<"uri">>(),
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies IShoppingMallProductImage.ICreate;

  const imageA = await api.functional.shoppingMall.products.images.create(
    connection,
    {
      productId: productA.id,
      body: imageABody,
    },
  );
  typia.assert<IShoppingMallProductImage>(imageA);

  // 4. Optionally create an image under productB (control image).
  const imageBBody = {
    image_uri: typia.random<string & tags.Format<"uri">>(),
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies IShoppingMallProductImage.ICreate;

  const imageB = await api.functional.shoppingMall.products.images.create(
    connection,
    {
      productId: productB.id,
      body: imageBBody,
    },
  );
  typia.assert<IShoppingMallProductImage>(imageB);

  // 5. Happy path: retrieve imageA with its correct productA id.
  const imageAFromCorrectProduct =
    await api.functional.shoppingMall.products.images.at(connection, {
      productId: productA.id,
      productImageId: imageA.id,
    });
  typia.assert<IShoppingMallProductImage>(imageAFromCorrectProduct);

  TestValidator.equals(
    "imageA id should match when accessed via correct product",
    imageAFromCorrectProduct.id,
    imageA.id,
  );
  TestValidator.equals(
    "imageA should belong to productA when accessed correctly",
    imageAFromCorrectProduct.shopping_mall_product_id,
    productA.id,
  );

  // 6. Negative path: attempt to retrieve imageA through productB's id.
  await TestValidator.error(
    "mismatched productId and productImageId should not return image data",
    async () => {
      await api.functional.shoppingMall.products.images.at(connection, {
        productId: productB.id,
        productImageId: imageA.id,
      });
    },
  );

  // 7. Sanity check: productB's own image remains accessible via correct mapping.
  const imageBFromCorrectProduct =
    await api.functional.shoppingMall.products.images.at(connection, {
      productId: productB.id,
      productImageId: imageB.id,
    });
  typia.assert<IShoppingMallProductImage>(imageBFromCorrectProduct);

  TestValidator.equals(
    "imageB id should match when accessed via correct product",
    imageBFromCorrectProduct.id,
    imageB.id,
  );
  TestValidator.equals(
    "imageB should belong to productB when accessed correctly",
    imageBFromCorrectProduct.shopping_mall_product_id,
    productB.id,
  );
}
