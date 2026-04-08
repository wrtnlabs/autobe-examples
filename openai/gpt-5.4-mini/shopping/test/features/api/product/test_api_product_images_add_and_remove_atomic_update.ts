import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductImage";
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

export async function test_api_product_images_add_and_remove_atomic_update(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const firstImage =
    await generate_random_mall_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: typia.random<string & tags.Format<"url">>(),
          sortOrder: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          isMain: true,
        } satisfies IMallPlatformProductImage.ICreate,
      },
    );
  typia.assert(firstImage);
  const secondImage =
    await generate_random_mall_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: typia.random<string & tags.Format<"url">>(),
          sortOrder: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          isMain: false,
        } satisfies IMallPlatformProductImage.ICreate,
      },
    );
  typia.assert(secondImage);
  const newImage = {
    imageUrl: typia.random<string & tags.Format<"url">>(),
    sortOrder: 0,
    isMain: true,
  } satisfies IMallPlatformProductImage.ICreate;
  const updated = await api.functional.mallPlatform.products.images.index(
    sellerConnection,
    {
      productId: product.id,
      body: {
        images: [newImage],
        deleteImageIds: [firstImage.id],
        page: 1,
        limit: 100,
      } satisfies IMallPlatformProductImage.IRequest,
    },
  );
  typia.assert(updated);
  TestValidator.predicate(
    "updated gallery contains at least one image",
    updated.data.length >= 1,
  );
  TestValidator.equals(
    "product image page is scoped to the requested product",
    updated.data.every((image) => image.product.id === product.id),
    true,
  );
  TestValidator.equals(
    "deleted image is removed from the final gallery",
    updated.data.some((image) => image.id === firstImage.id),
    false,
  );
  TestValidator.equals(
    "new image is attached to the same product",
    updated.data.some((image) => image.imageUrl === newImage.imageUrl),
    true,
  );
  TestValidator.equals(
    "images are returned in the requested order",
    updated.data[0].imageUrl,
    newImage.imageUrl,
  );
  TestValidator.equals(
    "first image becomes the main thumbnail",
    updated.data[0].isMain,
    true,
  );
  TestValidator.equals(
    "all later images are not main thumbnails",
    updated.data.slice(1).every((image) => image.isMain === false),
    true,
  );
}
