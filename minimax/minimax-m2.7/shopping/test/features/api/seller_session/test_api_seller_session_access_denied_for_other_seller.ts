import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_session_access_denied_for_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerA);
  // 2. Create Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {});
  typia.assert(sellerB);
  // 3. Extract Seller B's session ID from JWT token
  // JWT format: header.payload.signature, we need the payload (middle part)
  const tokenParts = sellerB.token.access.split(".");
  const payloadString = tokenParts[1];
  const payload = JSON.parse(atob(payloadString)) as {
    sessionId?: string;
  };
  const sellerBSessionId = payload.sessionId as string & tags.Format<"uuid">;
  // 4. Seller A tries to access Seller B's session - should be denied with 403
  await TestValidator.httpError(
    "seller cannot access another seller's session",
    403,
    async () =>
      await api.functional.ecommerceMall.seller.seller.sessions.at(
        sellerAConnection,
        {
          sessionId: sellerBSessionId,
        },
      ),
  );
}
