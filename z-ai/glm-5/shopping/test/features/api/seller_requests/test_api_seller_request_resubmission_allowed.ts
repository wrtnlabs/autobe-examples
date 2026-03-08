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

export async function test_api_seller_request_resubmission_allowed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Submit first administrator request
  const firstReason = RandomGenerator.paragraph({ sentences: 3 });
  const firstRequest =
    await generate_random_shopping_mall_seller_requests_create(
      sellerConnection,
      { body: { reason: firstReason } },
    );
  typia.assert(firstRequest);
  // 3. Submit second administrator request
  const secondReason = RandomGenerator.paragraph({ sentences: 3 });
  const secondRequest =
    await generate_random_shopping_mall_seller_requests_create(
      sellerConnection,
      { body: { reason: secondReason } },
    );
  typia.assert(secondRequest);
  // 4. Validate that both requests are created successfully with unique IDs
  TestValidator.notEquals(
    "request IDs should be unique",
    firstRequest.id,
    secondRequest.id,
  );
}
