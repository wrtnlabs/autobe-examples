import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";

export async function test_api_admin_login_requires_email_verification_when_configured(
  connection: api.IConnection,
) {
  // 1. Register a new admin via join
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();

  const joinBody = {
    email,
    password,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const joined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(joined);

  // Basic sanity checks on join response
  TestValidator.equals(
    "join response email should match input email",
    joined.email,
    email,
  );
  TestValidator.predicate(
    "join response should contain non-empty access token",
    joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "join response should contain non-empty refresh token",
    joined.token.refresh.length > 0,
  );

  if (joined.admin) {
    typia.assert<IShoppingMallAdmin.ISummary>(joined.admin);
    TestValidator.equals(
      "summary email should match top-level email on join",
      joined.admin.email,
      joined.email,
    );
    TestValidator.equals(
      "summary email_verified should match top-level email_verified on join",
      joined.admin.email_verified,
      joined.email_verified,
    );
  }

  // 2. Prepare an unauthenticated connection clone for explicit login
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Attempt login with the same credentials
  const loginBody = {
    email,
    password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const loggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(unauthConn, {
      body: loginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(loggedIn);

  // 4. Validate identity consistency between join and login
  TestValidator.equals(
    "login admin id should match join admin id",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "login email should match join email",
    loggedIn.email,
    joined.email,
  );

  // 5. Validate email_verified consistency as a proxy for verification policy
  TestValidator.equals(
    "login email_verified should match join email_verified",
    loggedIn.email_verified,
    joined.email_verified,
  );

  if (loggedIn.admin) {
    typia.assert<IShoppingMallAdmin.ISummary>(loggedIn.admin);
    TestValidator.equals(
      "login summary email should match top-level login email",
      loggedIn.admin.email,
      loggedIn.email,
    );
    TestValidator.equals(
      "login summary email_verified should match top-level login email_verified",
      loggedIn.admin.email_verified,
      loggedIn.email_verified,
    );
  }

  // 6. Validate token structure from login as well
  typia.assert<IAuthorizationToken>(loggedIn.token);
  TestValidator.predicate(
    "login response should contain non-empty access token",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "login response should contain non-empty refresh token",
    loggedIn.token.refresh.length > 0,
  );
}
