import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { generate_random_mall_platform_seller_products_images_create } from "../../../generate/generate_random_mall_platform_seller_products_images_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";
import { prepare_random_mall_platform_product_image } from "../../../prepare/prepare_random_mall_platform_product_image";

export async function test_api_product_image_retrieve_deleted_product_unavailable(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/seller/register",
      referrer: "https://example.com/marketing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: 10000,
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const imageBody = {
    imageUrl: "https://example.com/images/product-main.jpg",
    sortOrder: 1,
    isMain: true,
  } satisfies IMallPlatformProductImage.ICreate;
  const createdImage =
    await generate_random_mall_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: imageBody,
      },
    );
  typia.assert(createdImage);
  TestValidator.equals(
    "image belongs to the created product",
    createdImage.product.id,
    product.id,
  );
  TestValidator.equals(
    "image url matches the created image",
    createdImage.imageUrl,
    imageBody.imageUrl,
  );
  TestValidator.equals(
    "image sort order matches",
    createdImage.sortOrder,
    imageBody.sortOrder,
  );
  TestValidator.equals(
    "image main flag matches",
    createdImage.isMain,
    imageBody.isMain,
  );
  const retrievedImage =
    await api.functional.mallPlatform.seller.products.images.at(
      sellerConnection,
      {
        productId: product.id,
        imageId: createdImage.id,
      },
    );
  typia.assert(retrievedImage);
  TestValidator.equals(
    "retrieved image id matches",
    retrievedImage.id,
    createdImage.id,
  );
  TestValidator.equals(
    "retrieved image product matches",
    retrievedImage.product.id,
    product.id,
  );
  TestValidator.equals(
    "retrieved image url matches",
    retrievedImage.imageUrl,
    createdImage.imageUrl,
  );
  TestValidator.equals(
    "retrieved image sort order matches",
    retrievedImage.sortOrder,
    createdImage.sortOrder,
  );
  TestValidator.equals(
    "retrieved image main flag matches",
    retrievedImage.isMain,
    createdImage.isMain,
  );
  TestValidator.equals(
    "retrieved image created at matches",
    retrievedImage.createdAt,
    createdImage.createdAt,
  );
  TestValidator.equals(
    "retrieved image updated at matches",
    retrievedImage.updatedAt,
    createdImage.updatedAt,
  );
  TestValidator.equals(
    "retrieved image deleted at matches",
    retrievedImage.deletedAt,
    createdImage.deletedAt,
  );
}
