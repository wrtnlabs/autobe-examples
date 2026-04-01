import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";
import { prepare_random_mall_platform_product_image } from "../../../prepare/prepare_random_mall_platform_product_image";

export async function test_api_product_images_atomic_maintenance(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: "https://example.com/seller/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const initialImages =
    await api.functional.mallPlatform.seller.products.images.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          images: ArrayUtil.repeat(3, (index) => ({
            imageUrl: `https://cdn.example.com/products/${product.id}/image-${index + 1}.jpg`,
            sortOrder: index + 1,
            isMain: index === 0,
          })),
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductImage.IRequest,
      },
    );
  typia.assert(initialImages);
  TestValidator.equals("initial image count", initialImages.data.length, 3);
  TestValidator.equals(
    "initial main image exists",
    initialImages.data.some((item) => item.isMain),
    true,
  );
  const removedImageId = initialImages.data[1].id;
  const reorderedImageIds = [
    initialImages.data[2].id,
    initialImages.data[0].id,
  ];
  const addedImageUrl = `https://cdn.example.com/products/${product.id}/image-4.jpg`;
  const updatedImages =
    await api.functional.mallPlatform.seller.products.images.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          images: [
            {
              imageUrl: addedImageUrl,
              sortOrder: 4,
              isMain: false,
            } satisfies IMallPlatformProductImage.ICreate,
          ],
          reorderedImageIds: reorderedImageIds,
          removedImageIds: [removedImageId],
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductImage.IRequest,
      },
    );
  typia.assert(updatedImages);
  TestValidator.equals("page current", updatedImages.pagination.current, 1);
  TestValidator.equals("page limit", updatedImages.pagination.limit, 10);
  TestValidator.predicate(
    "response contains images",
    updatedImages.data.length >= 2,
  );
  TestValidator.equals(
    "removed image absent",
    updatedImages.data.some((item) => item.id === removedImageId),
    false,
  );
  TestValidator.equals(
    "new image present",
    updatedImages.data.some((item) => item.imageUrl === addedImageUrl),
    true,
  );
  TestValidator.equals(
    "updated order first image is main",
    updatedImages.data[0].isMain,
    true,
  );
  TestValidator.equals(
    "updated order first image preserved",
    updatedImages.data[0].id,
    reorderedImageIds[0],
  );
  TestValidator.equals(
    "updated order second image preserved",
    updatedImages.data[1].id,
    reorderedImageIds[1],
  );
  TestValidator.equals(
    "images reference owning product",
    updatedImages.data.every((item) => item.product.id === product.id),
    true,
  );
  TestValidator.predicate(
    "thumbnail image remains first",
    updatedImages.data[0].sortOrder <= updatedImages.data[1].sortOrder,
  );
}
