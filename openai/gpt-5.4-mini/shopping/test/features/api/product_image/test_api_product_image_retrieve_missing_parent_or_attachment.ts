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

export async function test_api_product_image_retrieve_missing_parent_or_attachment(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await api.functional.mallPlatform.auth.seller.join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com`,
      password: "password123!",
    },
  });
  await TestValidator.httpError(
    "missing parent product should return not found",
    [404],
    async () => {
      await api.functional.mallPlatform.seller.products.images.at(
        sellerConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          imageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  await TestValidator.httpError(
    "image requested under wrong parent product should return not found",
    [404],
    async () => {
      await api.functional.mallPlatform.seller.products.images.at(
        sellerConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          imageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
