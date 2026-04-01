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

export async function test_api_seller_join_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and register with valid credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSeller.IJoin,
    });
  // Validate complete response structure including all token fields
  typia.assert(authorized);
  // Verify seller ID is a valid non-empty string (typia.assert validates UUID format)
  TestValidator.predicate("seller ID is non-empty", authorized.id.length > 0);
  // Verify token expiration relationship (business logic not covered by type validation)
  const expiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
  // Verify the authorize function properly updated the connection headers
  TestValidator.predicate(
    "seller connection has authorization header",
    sellerConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header matches access token",
    sellerConnection.headers?.Authorization,
    authorized.token.access,
  );
}
