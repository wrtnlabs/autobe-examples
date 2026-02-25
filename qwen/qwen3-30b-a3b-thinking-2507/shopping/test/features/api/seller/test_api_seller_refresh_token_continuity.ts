import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refresh_token_continuity(
  connection: api.IConnection,
) {
  // 1. Seller account creation via join
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IEcommerceSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Seller123!",
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IEcommerceSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  // 2. Extract refresh token from authentication response
  const refreshToken = sellerAuth.token.refresh;
  // 3. Perform token refresh using the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth: IEcommerceSeller.IAuthorized =
    await api.functional.ecommerce.auth.seller.refresh(refreshConnection, {
      body: {} satisfies IEcommerceSeller.IRefresh,
    });
  typia.assert(refreshedAuth);
  // 4. Validate token refresh behavior - new tokens with updated timestamps
  TestValidator.predicate(
    "Access tokens should differ",
    sellerAuth.token.access !== refreshedAuth.token.access,
  );
  TestValidator.predicate(
    "Refresh tokens should differ",
    sellerAuth.token.refresh !== refreshedAuth.token.refresh,
  );
  TestValidator.predicate(
    "New access token expires later",
    new Date(refreshedAuth.token.expired_at) >
      new Date(sellerAuth.token.expired_at),
  );
  TestValidator.predicate(
    "New refresh token expires later",
    new Date(refreshedAuth.token.refreshable_until) >
      new Date(sellerAuth.token.refreshable_until),
  );
}
