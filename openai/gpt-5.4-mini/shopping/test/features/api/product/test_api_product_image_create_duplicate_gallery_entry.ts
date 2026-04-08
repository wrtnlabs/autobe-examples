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

export async function test_api_product_image_create_duplicate_gallery_entry(
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
  const productId = typia.random<string & tags.Format<"uuid">>();
  const imageUrl = typia.random<string & tags.Format<"url">>();
  const sortOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const created =
    await generate_random_mall_platform_seller_products_images_create(
      sellerConnection,
      {
        params: { productId },
        body: {
          imageUrl,
          sortOrder,
          isMain: true,
        } satisfies IMallPlatformProductImage.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "created image URL should match",
    created.imageUrl,
    imageUrl,
  );
  TestValidator.equals(
    "created image sort order should match",
    created.sortOrder,
    sortOrder,
  );
  TestValidator.equals("created image should be main", created.isMain, true);
  await TestValidator.httpError(
    "duplicate product image creation should be rejected",
    [400, 409],
    async () => {
      await generate_random_mall_platform_seller_products_images_create(
        sellerConnection,
        {
          params: { productId },
          body: {
            imageUrl,
            sortOrder,
            isMain: false,
          } satisfies IMallPlatformProductImage.ICreate,
        },
      );
    },
  );
}
