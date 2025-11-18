import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallCustomerRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerRefresh";

export async function test_api_customer_token_refresh_after_login(
  connection: api.IConnection,
) {
  // 1. Customer join - create a new customer with known credentials
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinBody = {
    email,
    password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const joined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(joined);

  // 2. Customer login with the same credentials
  const loginBody = {
    email,
    password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const loggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: loginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(loggedIn);

  // 3. Extract refresh token from login response
  const loginToken: IAuthorizationToken = loggedIn.token;
  TestValidator.predicate(
    "login refresh token should be a non-empty string",
    () => loginToken.refresh.length > 0,
  );

  // 4. Refresh tokens using the refresh token from login
  const refreshBody = {
    refreshToken: loginToken.refresh,
  } satisfies IShoppingMallCustomerRefresh.IRequest;

  const refreshed: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.refresh(connection, {
      body: refreshBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(refreshed);

  const refreshedToken: IAuthorizationToken = refreshed.token;

  // 5. Identity and status consistency across join, login, and refresh
  TestValidator.equals(
    "login and refresh should have same customer id",
    loggedIn.id,
    refreshed.id,
  );
  TestValidator.equals(
    "login and refresh should have same customer email",
    loggedIn.email,
    refreshed.email,
  );
  TestValidator.equals(
    "login and refresh should have same status",
    loggedIn.status,
    refreshed.status,
  );
  TestValidator.equals(
    "login and refresh should have same email_verified flag",
    loggedIn.email_verified,
    refreshed.email_verified,
  );

  TestValidator.equals(
    "joined and login should have same customer id",
    joined.id,
    loggedIn.id,
  );
  TestValidator.equals(
    "joined and login should have same customer email",
    joined.email,
    loggedIn.email,
  );
  TestValidator.equals(
    "joined and login should have same status",
    joined.status,
    loggedIn.status,
  );
  TestValidator.equals(
    "joined and login should have same email_verified flag",
    joined.email_verified,
    loggedIn.email_verified,
  );

  // 6. Token structure and temporal sanity checks for refreshed tokens
  TestValidator.predicate(
    "refreshed access token should be non-empty",
    () => refreshedToken.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token should be non-empty",
    () => refreshedToken.refresh.length > 0,
  );

  const now: Date = new Date();
  const expiredAt: Date = new Date(refreshedToken.expired_at);
  const refreshableUntil: Date = new Date(refreshedToken.refreshable_until);

  TestValidator.predicate(
    "refreshed access token expired_at should be in the future",
    () => expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshed refresh token refreshable_until should be in the future",
    () => refreshableUntil.getTime() > now.getTime(),
  );
}
