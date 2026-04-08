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

export async function test_api_product_image_create_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!" as string & tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const image =
    await generate_random_mall_platform_seller_products_images_create(
      sellerConnection,
      {
        params: {
          productId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          imageUrl: typia.random<string & tags.Format<"uri">>(),
          sortOrder: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          isMain: typia.random<boolean>(),
        } satisfies IMallPlatformProductImage.ICreate,
      },
    );
  typia.assert(image);
  TestValidator.equals(
    "image ownership product id should be stable",
    image.product.id.length > 0,
    true,
  );
  TestValidator.equals(
    "image url should be stored",
    image.imageUrl.length > 0,
    true,
  );
  TestValidator.predicate(
    "image sort order is non-negative",
    image.sortOrder >= 0,
  );
  TestValidator.predicate(
    "image timestamps are present",
    image.createdAt.length > 0 && image.updatedAt.length > 0,
  );
  TestValidator.equals("image is not soft deleted", image.deletedAt, null);
}
