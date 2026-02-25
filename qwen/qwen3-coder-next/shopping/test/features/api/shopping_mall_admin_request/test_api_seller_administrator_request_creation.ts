import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
import { generate_random_shopping_mall_admin_request_create } from "../../../generate/generate_random_shopping_mall_admin_request_create";
import { prepare_random_shopping_mall_admin } from "../../../prepare/prepare_random_shopping_mall_admin";

export async function test_api_seller_administrator_request_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData = typia.random<IShoppingMallSeller.IJoin>();
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerData,
  });
  typia.assert(sellerAuthorized);
  // 2. Submit administrator request using utility function
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  await generate_random_shopping_mall_admin_request_create(sellerConnection, {
    body: { reason },
  });
}
