import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_retrieval_self(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinData: IShoppingMallSeller.IJoin = {
    email: typia.random<string & typia.tags.Format<"email">>(),
    password: typia.random<string & typia.tags.Format<"password">>(),
    shop_name: typia.random<string>(),
    shop_description: typia.random<string>(),
    logo_image_url: null,
  };
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.shoppingMall.auth.seller.join(sellerConnection, {
      body: sellerJoinData,
    });
  typia.assert(sellerAuthorized);
  // 2. Retrieve seller profile
  const retrievedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.sellers.at(sellerConnection, {
      sellerId: sellerAuthorized.data.profile.id,
    });
  typia.assert(retrievedSeller);
}
