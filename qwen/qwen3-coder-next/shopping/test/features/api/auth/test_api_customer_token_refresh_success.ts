import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer and establish initial session
  const joinConnection: api.IConnection = { host: connection.host };
  const customerJoinBody: IShoppingMallCustomer.IJoin = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
    >(),
    password: RandomGenerator.alphabets(12) satisfies string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/register",
    referrer: "https://google.com/search",
  };
  const authorized = await authorize_customer_join(joinConnection, {
    body: customerJoinBody,
  });
  typia.assert(authorized);
  // Step 2: Extract initial refresh token from the session
  const initialAccessToken = authorized.token.access;
  const initialRefreshToken = authorized.tokens.refresh_token;
  typia.assert(initialAccessToken);
  typia.assert(initialRefreshToken);
  // Step 3: Create a new connection for token refresh
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshBody: IShoppingMallCustomer.IRefresh = {
    refresh_token: initialRefreshToken,
    access_token: initialAccessToken,
    customer: authorized.customer,
    expires_at: new Date().toISOString(),
  };
  // Step 4: Execute token refresh
  const refreshed = await authorize_customer_refresh(refreshConnection, {
    body: refreshBody,
  });
  typia.assert(refreshed);
  // Step 5: Verify that new tokens are issued
  TestValidator.notEquals(
    "access token changed",
    refreshed.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "refresh token changed",
    refreshed.tokens.refresh_token,
    initialRefreshToken,
  );
  // Step 6: Verify customer identity is preserved
  TestValidator.equals(
    "customer email matches",
    refreshed.customer.email,
    customerJoinBody.email,
  );
  // Step 7: Validate token expiration structure
  const now = new Date().getTime();
  const expiresAt = new Date(
    refreshed.tokens.access_token_expires_at,
  ).getTime();
  // Access token should expire in ~30 minutes (1800000 ms)
  TestValidator.predicate(
    "access token expires in ~30 minutes",
    () => Math.abs(expiresAt - now - 1800000) < 60000,
  );
  // Verify customer summary is included
  TestValidator.predicate("customer has id", () => !!refreshed.customer.id);
  TestValidator.predicate(
    "customer has email",
    () => !!refreshed.customer.email,
  );
}
