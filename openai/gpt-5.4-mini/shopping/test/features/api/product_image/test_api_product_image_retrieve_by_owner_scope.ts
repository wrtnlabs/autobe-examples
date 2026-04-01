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
import { generate_random_mall_platform_seller_products_images_create } from "../../../generate/generate_random_mall_platform_seller_products_images_create";
import { prepare_random_mall_platform_product_image } from "../../../prepare/prepare_random_mall_platform_product_image";

export async function test_api_product_image_retrieve_by_owner_scope(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: "password123!" satisfies string & tags.Format<"password">,
      href: "https://example.com/seller/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const createdImage: IMallPlatformProductImage =
    await generate_random_mall_platform_seller_products_images_create(
      sellerConnection,
      {
        params: {
          productId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          imageUrl: `https://example.com/images/${RandomGenerator.alphaNumeric(12)}.png`,
          sortOrder: 1,
          isMain: true,
        } satisfies IMallPlatformProductImage.ICreate,
      },
    );
  typia.assert(createdImage);
  const retrieved: IMallPlatformProductImage =
    await api.functional.mallPlatform.seller.products.images.at(
      sellerConnection,
      {
        productId: createdImage.product.id,
        imageId: createdImage.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals("image id", retrieved.id, createdImage.id);
  TestValidator.equals(
    "product relation",
    retrieved.product,
    createdImage.product,
  );
  TestValidator.equals("image url", retrieved.imageUrl, createdImage.imageUrl);
  TestValidator.equals(
    "sort order",
    retrieved.sortOrder,
    createdImage.sortOrder,
  );
  TestValidator.equals(
    "main image flag",
    retrieved.isMain,
    createdImage.isMain,
  );
  TestValidator.equals(
    "created at",
    retrieved.createdAt,
    createdImage.createdAt,
  );
  TestValidator.equals(
    "updated at",
    retrieved.updatedAt,
    createdImage.updatedAt,
  );
  TestValidator.equals(
    "deleted at",
    retrieved.deletedAt,
    createdImage.deletedAt,
  );
}
