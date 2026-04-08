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
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";

export async function test_api_product_image_thumbnail_consistency_update(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: typia.random<number>(),
      } satisfies IMallPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const imageId = typia.random<string & tags.Format<"uuid">>();
  const updated =
    await api.functional.mallPlatform.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        imageId,
        body: {
          sortOrder: typia.random<number & tags.Type<"int32">>(),
          isMain: true,
        } satisfies IMallPlatformProductImage.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated image belongs to the created product",
    updated.product.id,
    product.id,
  );
  TestValidator.equals("updated image id is preserved", updated.id, imageId);
  TestValidator.equals(
    "updated image main thumbnail flag is applied",
    updated.isMain,
    true,
  );
  TestValidator.predicate(
    "updated image sort order is an integer value",
    Number.isInteger(updated.sortOrder),
  );
}
