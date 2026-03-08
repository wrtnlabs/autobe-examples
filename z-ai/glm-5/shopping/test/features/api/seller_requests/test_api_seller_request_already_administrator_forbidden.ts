import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorSession";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_requests_create } from "../../../generate/generate_random_shopping_mall_seller_requests_create";
import { prepare_random_shopping_mall_administrator_session } from "../../../prepare/prepare_random_shopping_mall_administrator_session";

export async function test_api_seller_request_already_administrator_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Attempt to create administrator request
  // This should return 403 Forbidden if the seller already has administrator privileges
  const requestBody = {
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdministratorSession.ICreate;
  // 3. Validate that the request is forbidden for administrators
  await TestValidator.httpError(
    "administrator cannot submit new administrator request",
    403,
    () =>
      api.functional.shoppingMall.seller.requests.create(sellerConnection, {
        body: requestBody,
      }),
  );
}
