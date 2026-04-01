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

export async function test_api_product_images_ownership_restriction(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_seller_join(ownerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` as string,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(owner);
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruder = await authorize_seller_join(intruderConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` as string,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(intruder);
  const product = await api.functional.mallPlatform.seller.products.create(
    ownerConnection,
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
  const initialImages =
    await api.functional.mallPlatform.seller.products.images.index(
      ownerConnection,
      {
        productId: product.id,
        body: {
          images: [
            {
              imageUrl: "https://example.com/image-a.jpg",
              sortOrder: 0,
              isMain: true,
            },
            {
              imageUrl: "https://example.com/image-b.jpg",
              sortOrder: 1,
              isMain: false,
            },
          ] satisfies IMallPlatformProductImage.ICreate[],
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductImage.IRequest,
      },
    );
  typia.assert(initialImages);
  const initialImageIds = initialImages.data.map((item) => item.id);
  const initialImageUrls = initialImages.data.map((item) => item.imageUrl);
  await TestValidator.httpError(
    "unauthorized seller cannot modify another seller's product images",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.seller.products.images.index(
        intruderConnection,
        {
          productId: product.id,
          body: {
            reorderedImageIds: [...initialImageIds].reverse(),
            removedImageIds: [initialImageIds[0]],
            page: 1,
            limit: 10,
          } satisfies IMallPlatformProductImage.IRequest,
        },
      );
    },
  );
  const afterImages =
    await api.functional.mallPlatform.seller.products.images.index(
      ownerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductImage.IRequest,
      },
    );
  typia.assert(afterImages);
  TestValidator.equals(
    "image count unchanged",
    afterImages.data.length,
    initialImages.data.length,
  );
  TestValidator.equals(
    "image order unchanged",
    afterImages.data.map((item) => item.id),
    initialImageIds,
  );
  TestValidator.equals(
    "image urls unchanged",
    afterImages.data.map((item) => item.imageUrl),
    initialImageUrls,
  );
  TestValidator.equals(
    "main image unchanged",
    afterImages.data[0]?.id,
    initialImages.data[0]?.id,
  );
}
