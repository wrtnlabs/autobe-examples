import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_product_variant_delete_removable_variant(
  connection: api.IConnection,
): Promise<void> {
  const sellerRegistrationConnection: api.IConnection = {
    host: connection.host,
  };
  const seller = await authorize_seller_join(sellerRegistrationConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12) + "1A!",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: seller.token.access,
    },
  };
  await api.functional.mallPlatform.seller.products.variants.erase(
    sellerConnection,
    {
      productId: typia.random<string & tags.Format<"uuid">>(),
      variantId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
}
