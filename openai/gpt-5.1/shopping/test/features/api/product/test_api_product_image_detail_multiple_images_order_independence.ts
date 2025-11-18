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

export async function test_api_product_image_detail_multiple_images_order_independence(
  connection: api.IConnection,
) {
  // 1. Seller joins (auth) to obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create a product owned by this seller
  const productBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // Ensure basic relationship from response
  TestValidator.equals(
    "product seller id matches authorized seller",
    product.shopping_mall_seller_id,
    seller.id,
  );

  // 3. Create three images with deterministic display_order values 0, 1, 2
  // Use separate random URIs to keep tagged URI type without losing tags
  const image1Body = {
    image_uri: typia.random<string & tags.Format<"uri">>(),
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    // 0 as a non-negative int32
    display_order: 0 satisfies number as number,
  } satisfies IShoppingMallProductImage.ICreate;

  const image2Body = {
    image_uri: typia.random<string & tags.Format<"uri">>(),
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    // 1 as a non-negative int32
    display_order: 1 satisfies number as number,
  } satisfies IShoppingMallProductImage.ICreate;

  const image3Body = {
    image_uri: typia.random<string & tags.Format<"uri">>(),
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    // 2 as a non-negative int32
    display_order: 2 satisfies number as number,
  } satisfies IShoppingMallProductImage.ICreate;

  const images: IShoppingMallProductImage[] = [];

  const createdImage1: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: product.id,
      body: image1Body,
    });
  typia.assert<IShoppingMallProductImage>(createdImage1);
  TestValidator.equals(
    "image1 product relation",
    createdImage1.shopping_mall_product_id,
    product.id,
  );
  images.push(createdImage1);

  const createdImage2: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: product.id,
      body: image2Body,
    });
  typia.assert<IShoppingMallProductImage>(createdImage2);
  TestValidator.equals(
    "image2 product relation",
    createdImage2.shopping_mall_product_id,
    product.id,
  );
  images.push(createdImage2);

  const createdImage3: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: product.id,
      body: image3Body,
    });
  typia.assert<IShoppingMallProductImage>(createdImage3);
  TestValidator.equals(
    "image3 product relation",
    createdImage3.shopping_mall_product_id,
    product.id,
  );
  images.push(createdImage3);

  TestValidator.equals("three images created", images.length, 3);

  const firstImage = images[0];
  const middleImage = images[1];
  const lastImage = images[2];

  // Sanity check: display orders are 0, 1, 2 respectively
  TestValidator.equals(
    "first image display_order is 0",
    firstImage.display_order,
    0,
  );
  TestValidator.equals(
    "middle image display_order is 1",
    middleImage.display_order,
    1,
  );
  TestValidator.equals(
    "last image display_order is 2",
    lastImage.display_order,
    2,
  );

  // 4. Retrieve the middle image by its id and validate identity & fields
  const reloadedMiddle: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.at(connection, {
      productId: product.id,
      productImageId: middleImage.id,
    });
  typia.assert<IShoppingMallProductImage>(reloadedMiddle);

  TestValidator.equals(
    "middle image id should match requested id",
    reloadedMiddle.id,
    middleImage.id,
  );
  TestValidator.equals(
    "middle image product id must match parent product",
    reloadedMiddle.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "middle image uri should be preserved",
    reloadedMiddle.image_uri,
    middleImage.image_uri,
  );
  TestValidator.equals(
    "middle image display_order should be preserved",
    reloadedMiddle.display_order,
    middleImage.display_order,
  );

  // 5. Re-fetch first and last images to ensure per-image correctness
  const reloadedFirst: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.at(connection, {
      productId: product.id,
      productImageId: firstImage.id,
    });
  typia.assert<IShoppingMallProductImage>(reloadedFirst);
  TestValidator.equals(
    "first image id should match requested id",
    reloadedFirst.id,
    firstImage.id,
  );
  TestValidator.equals(
    "first image product id must match parent product",
    reloadedFirst.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "first image display_order should remain 0",
    reloadedFirst.display_order,
    firstImage.display_order,
  );

  const reloadedLast: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.at(connection, {
      productId: product.id,
      productImageId: lastImage.id,
    });
  typia.assert<IShoppingMallProductImage>(reloadedLast);
  TestValidator.equals(
    "last image id should match requested id",
    reloadedLast.id,
    lastImage.id,
  );
  TestValidator.equals(
    "last image product id must match parent product",
    reloadedLast.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "last image display_order should remain 2",
    reloadedLast.display_order,
    lastImage.display_order,
  );
}
