import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

export async function test_api_customer_login_success_existing_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer using /auth/customer/join
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = RandomGenerator.alphaNumeric(16);
  const name = RandomGenerator.name();

  const href: string & tags.Format<"uri"> =
    "https://shop.example.com/signup" as string & tags.Format<"uri">;
  const referrer: string & tags.Format<"uri"> =
    "https://shop.example.com/landing" as string & tags.Format<"uri">;

  const joinBody = {
    email,
    password,
    name,
    href,
    referrer,
    ip: null,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const joined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(joined);

  // Basic identity sanity checks on join response
  TestValidator.equals("join: email matches input", joined.email, email);
  TestValidator.equals("join: name matches input", joined.name, name);
  typia.assert<string & tags.Format<"uuid">>(joined.id);

  // 2. Log in with the same credentials using /auth/customer/login
  const loginHref: string & tags.Format<"uri"> =
    "https://shop.example.com/login" as string & tags.Format<"uri">;
  const loginReferrer: string & tags.Format<"uri"> =
    "https://shop.example.com/home" as string & tags.Format<"uri">;

  const loginBody = {
    email,
    password,
    href: loginHref,
    referrer: loginReferrer,
    ip: "203.0.113.10",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const loggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: loginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(loggedIn);

  // 3. Identity consistency checks between join and login
  TestValidator.equals(
    "login: id matches joined customer id",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "login: email matches joined email",
    loggedIn.email,
    joined.email,
  );
  TestValidator.equals(
    "login: name matches joined name",
    loggedIn.name,
    joined.name,
  );
  TestValidator.equals(
    "login: status matches join status",
    loggedIn.status,
    joined.status,
  );
  TestValidator.equals(
    "login: createdAt is unchanged",
    loggedIn.createdAt,
    joined.createdAt,
  );

  // updatedAt may advance on login (depending on implementation), so we only
  // assert that it is not older than the join updatedAt.
  TestValidator.predicate(
    "login: updatedAt is not before join.updatedAt",
    () =>
      new Date(loggedIn.updatedAt).getTime() >=
      new Date(joined.updatedAt).getTime(),
  );

  // 4. Token freshness checks
  const joinToken: IAuthorizationToken = joined.token;
  const loginToken: IAuthorizationToken = loggedIn.token;

  TestValidator.notEquals(
    "access token should change on login",
    loginToken.access,
    joinToken.access,
  );
  TestValidator.notEquals(
    "refresh token should change on login",
    loginToken.refresh,
    joinToken.refresh,
  );

  // Access and refresh token structures must be valid
  typia.assert<IAuthorizationToken>(joinToken);
  typia.assert<IAuthorizationToken>(loginToken);
}
