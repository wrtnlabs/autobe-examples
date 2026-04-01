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

export async function test_api_product_image_create_for_owned_product(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "password123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    imageUrl: `https://example.com/images/${RandomGenerator.alphaNumeric(12)}.jpg`,
    sortOrder: 1,
    isMain: true,
  } satisfies IMallPlatformProductImage.ICreate;
  const image =
    await generate_random_mall_platform_seller_products_images_create(
      sellerConnection,
      {
        params: {
          productId,
        },
        body: request,
      },
    );
  typia.assert(image);
  TestValidator.equals(
    "image URL should match request",
    image.imageUrl,
    request.imageUrl,
  );
  TestValidator.equals(
    "sort order should match request",
    image.sortOrder,
    request.sortOrder,
  );
  TestValidator.equals(
    "main flag should match request",
    image.isMain,
    request.isMain,
  );
  TestValidator.equals(
    "image should belong to requested product",
    image.product.id,
    productId,
  );
  TestValidator.predicate(
    "created timestamp exists",
    image.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp exists",
    image.updatedAt.length > 0,
  );
  TestValidator.equals("deletedAt should be null", image.deletedAt, null);
}
