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

export async function test_api_product_image_update_own_image(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const output =
    await api.functional.mallPlatform.seller.products.images.update(
      sellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        imageId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          imageUrl: "https://example.com/images/updated-product-image.png",
          sortOrder: 0,
          isMain: true,
        } satisfies IMallPlatformProductImage.IUpdate,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "updated image url should be returned",
    output.imageUrl,
    "https://example.com/images/updated-product-image.png",
  );
  TestValidator.equals(
    "updated sort order should be returned",
    output.sortOrder,
    0,
  );
  TestValidator.equals(
    "updated main flag should be returned",
    output.isMain,
    true,
  );
  TestValidator.predicate(
    "product association should exist",
    output.product !== null && output.product !== undefined,
  );
}
