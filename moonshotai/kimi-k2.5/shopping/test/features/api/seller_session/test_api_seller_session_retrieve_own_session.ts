import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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

export async function test_api_seller_session_retrieve_own_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate via join
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(authorized);
  // 2. Store seller details for later validation
  const expectedSellerId = authorized.id;
  const expectedSellerEmail = authorized.email;
  // 3. Generate session ID for retrieval
  // In production, this typically comes from JWT token claims
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve the session using authenticated seller connection
  const session = await api.functional.ecommerceMall.seller.sessions.at(
    sellerConnection,
    { sessionId },
  );
  typia.assert(session);
  // 5. Validate session ownership - seller in session matches authenticated seller
  TestValidator.equals(
    "session seller ID matches",
    session.seller.id,
    expectedSellerId,
  );
  TestValidator.equals(
    "session seller email matches",
    session.seller.email,
    expectedSellerEmail,
  );
}
