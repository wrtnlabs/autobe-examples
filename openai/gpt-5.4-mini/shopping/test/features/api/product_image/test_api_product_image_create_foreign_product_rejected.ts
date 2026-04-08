import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
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

export async function test_api_product_image_create_foreign_product_rejected(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that a seller cannot create an image for a product they do not own.
   *
   * This scenario validates seller-scoped authorization on product image
   * creation. The test authenticates two separate seller accounts and confirms
   * that the second seller is rejected when attempting to attach an image to a
   * product identifier that is not owned by them.
   *
   * 1. Seller A and Seller B are registered independently.
   * 2. Seller B attempts to create a product image for a foreign product id.
   * 3. The request is rejected because the caller is not the product owner.
   */
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerA);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerB);
  const foreignProductId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    imageUrl: typia.random<string & tags.Format<"url">>(),
    sortOrder: 0,
    isMain: true,
  } satisfies IMallPlatformProductImage.ICreate;
  await TestValidator.httpError(
    "foreign seller cannot create product image",
    [400, 401, 403, 404],
    async () => {
      await generate_random_mall_platform_seller_products_images_create(
        sellerBConnection,
        {
          params: { productId: foreignProductId },
          body,
        },
      );
    },
  );
}
