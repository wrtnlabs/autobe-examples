import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate user login (positive and negative scenarios)
 *
 * 1. Register a user with valid unique credentials
 * 2. Perform login with correct email and password
 *
 *    - Validate response includes identity fields (id, email, timestamps, optional
 *         deleted_at)
 *    - Validate token object: access, refresh, expired_at, refreshable_until
 * 3. Attempt login with incorrect password (expect error)
 * 4. Attempt login with incorrect email (expect error)
 */
export async function test_api_user_login_success(connection: api.IConnection) {
  // 1. Prepare user registration payload
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
  >();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // optional ip field (randomly supply ipv4 or undefined)
  const supplyIp = Math.random() < 0.5;
  const ip:
    | (string & (tags.Format<"ipv4"> | tags.Format<"ipv6">))
    | null
    | undefined = supplyIp
    ? typia.random<string & tags.Format<"ipv4">>()
    : undefined;
  const joinRequest = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies ITodoAppUser.IJoin;

  // 2. Register/join
  const registered: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinRequest });
  typia.assert(registered);

  // 3. Login with correct credentials
  const loginRequest = {
    email,
    password,
  } satisfies ITodoAppUser.ILogin;
  const authorized: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.login(connection, { body: loginRequest });
  typia.assert(authorized);

  // Validate identity fields
  TestValidator.equals(
    "login id matches join id",
    authorized.id,
    registered.id,
  );
  TestValidator.equals("login email matches input", authorized.email, email);
  TestValidator.equals(
    "login created_at matches",
    authorized.created_at,
    registered.created_at,
  );
  TestValidator.equals(
    "login updated_at matches",
    authorized.updated_at,
    registered.updated_at,
  );
  TestValidator.equals(
    "login deleted_at matches",
    authorized.deleted_at,
    registered.deleted_at,
  );

  // Validate token structure
  typia.assert<IAuthorizationToken>(authorized.token);
  TestValidator.predicate(
    "access token is non-empty string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is string",
    typeof authorized.token.expired_at === "string",
  );
  TestValidator.predicate(
    "refreshable_until is string",
    typeof authorized.token.refreshable_until === "string",
  );

  // 4. Login fails with wrong password
  await TestValidator.error("login fails with incorrect password", async () => {
    await api.functional.auth.user.login(connection, {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(16), // wrong password
      } satisfies ITodoAppUser.ILogin,
    });
  });

  // 5. Login fails with wrong email
  await TestValidator.error("login fails with incorrect email", async () => {
    await api.functional.auth.user.login(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(), // wrong email
        password,
      } satisfies ITodoAppUser.ILogin,
    });
  });
}
