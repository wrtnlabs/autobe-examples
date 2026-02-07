import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_password_reset_initiation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const userEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerConnection, {
    body: { email: userEmail } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Initialize password reset request
  const resetConnection: api.IConnection = { host: connection.host };
  const resetResponse =
    await api.functional.shoppingMall.seller.reset_request.request(
      resetConnection,
      {
        body: {
          email: userEmail,
        } satisfies IShoppingMallSnapshot.IResetRequest,
      },
    );
  typia.assert(resetResponse);
}
