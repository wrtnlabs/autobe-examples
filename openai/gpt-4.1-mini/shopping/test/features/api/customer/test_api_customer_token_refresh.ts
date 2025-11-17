import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_token_refresh(
  connection: api.IConnection,
) {
  // 1. Create new customer account via join endpoint
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const joinBody = {
    email: email,
    password: "password123",
    href: "https://example.com/signup",
    referrer: "https://google.com",
  } satisfies IShoppingMallCustomer.ICreate;

  // Send join request and receive IShoppingMallCustomer.IAuthorized response
  const joinResponse: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(joinResponse);

  // 2. Use refresh token from joinResponse.token.refresh to refresh access token
  const refreshBody = {
    refresh_token: joinResponse.token.refresh,
    href: "https://example.com/refresh",
    referrer: "https://google.com",
    ip: null,
  } satisfies IShoppingMallCustomer.IRefresh;

  // Call refresh endpoint
  const refreshResponse: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshResponse);

  // 3. Validate that the refreshed access token is different from the old one
  TestValidator.notEquals(
    "Refreshed access token must differ from original",
    joinResponse.token.access,
    refreshResponse.token.access,
  );

  // 4. Validate expiration timestamps are valid ISO date-time strings via typia.assert
  typia.assert<string & tags.Format<"date-time">>(
    joinResponse.token.expired_at,
  );
  typia.assert<string & tags.Format<"date-time">>(
    joinResponse.token.refreshable_until,
  );
  typia.assert<string & tags.Format<"date-time">>(
    refreshResponse.token.expired_at,
  );
  typia.assert<string & tags.Format<"date-time">>(
    refreshResponse.token.refreshable_until,
  );
}
