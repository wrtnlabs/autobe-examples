import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_session_termination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new seller account
  const joinConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(joinConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Login as seller to establish active session
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_seller_login(loginConnection, {
    body: {} satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginResponse);
  // Generate a valid UUID for the sessionId
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Terminate the seller's session using the generated session ID
  const terminateConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.seller.sessions.erase(terminateConnection, {
    sessionId,
  });
}
