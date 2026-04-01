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

export async function test_api_product_images_transactional_rejection(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: null,
        basePrice: typia.random<number & tags.Type<"int32">>(),
      },
    },
  );
  typia.assert(product);
  const initialImages =
    await api.functional.mallPlatform.seller.products.images.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          images: [
            {
              imageUrl: "https://example.com/images/1.jpg",
              sortOrder: 0,
              isMain: true,
            },
            {
              imageUrl: "https://example.com/images/2.jpg",
              sortOrder: 1,
              isMain: false,
            },
          ] satisfies IMallPlatformProductImage.ICreate[],
        } satisfies IMallPlatformProductImage.IRequest,
      },
    );
  typia.assert(initialImages);
  TestValidator.predicate(
    "initial images should be present",
    initialImages.data.length >= 2,
  );
  const firstImageId = initialImages.data[0].id;
  const secondImageId = initialImages.data[1].id;
  await TestValidator.error(
    "invalid referenced image should reject the entire transaction",
    async () => {
      await api.functional.mallPlatform.seller.products.images.index(
        sellerConnection,
        {
          productId: product.id,
          body: {
            reorderedImageIds: [
              secondImageId,
              typia.random<string & tags.Format<"uuid">>(),
              firstImageId,
            ],
            removedImageIds: [typia.random<string & tags.Format<"uuid">>()],
            images: [
              {
                imageUrl: "https://example.com/images/3.jpg",
                sortOrder: 2,
                isMain: false,
              },
            ] satisfies IMallPlatformProductImage.ICreate[],
          } satisfies IMallPlatformProductImage.IRequest,
        },
      );
    },
  );
}
