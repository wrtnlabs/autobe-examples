import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test login functionality with and without explicit IP address in the request.
 *
 * This test validates that the login endpoint properly handles the optional IP
 * field in different scenarios:
 *
 * 1. Register a new user account
 * 2. Test login with explicit IPv4 address
 * 3. Test login with explicit IPv6 address
 * 4. Test login with IP field omitted (undefined)
 * 5. Test login with IP field set to null
 *
 * All scenarios should result in successful authentication with valid tokens.
 */
export async function test_api_user_login_with_optional_ip(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePassword123!";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
        ip: "192.168.1.100",
        href,
        referrer,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registeredUser);

  // Verify registration was successful
  TestValidator.equals(
    "registered user email matches",
    registeredUser.email,
    email,
  );
  TestValidator.predicate(
    "user has valid token",
    !!registeredUser.token.access,
  );

  // Step 2: Test login with explicit IPv4 address
  const ipv4Address = "203.0.113.42";
  const loginWithIPv4: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email,
        password,
        ip: ipv4Address,
        href,
        referrer,
      } satisfies ITodoListUser.ILogin,
    });
  typia.assert(loginWithIPv4);

  TestValidator.equals(
    "login with IPv4 email matches",
    loginWithIPv4.email,
    email,
  );
  TestValidator.predicate(
    "login with IPv4 has valid access token",
    !!loginWithIPv4.token.access,
  );
  TestValidator.predicate(
    "login with IPv4 has valid refresh token",
    !!loginWithIPv4.token.refresh,
  );

  // Step 3: Test login with explicit IPv6 address
  const ipv6Address = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
  const loginWithIPv6: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email,
        password,
        ip: ipv6Address,
        href,
        referrer,
      } satisfies ITodoListUser.ILogin,
    });
  typia.assert(loginWithIPv6);

  TestValidator.equals(
    "login with IPv6 email matches",
    loginWithIPv6.email,
    email,
  );
  TestValidator.predicate(
    "login with IPv6 has valid access token",
    !!loginWithIPv6.token.access,
  );
  TestValidator.predicate(
    "login with IPv6 has valid refresh token",
    !!loginWithIPv6.token.refresh,
  );

  // Step 4: Test login with IP field omitted (undefined)
  const loginWithoutIP: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies ITodoListUser.ILogin,
    });
  typia.assert(loginWithoutIP);

  TestValidator.equals(
    "login without IP email matches",
    loginWithoutIP.email,
    email,
  );
  TestValidator.predicate(
    "login without IP has valid access token",
    !!loginWithoutIP.token.access,
  );
  TestValidator.predicate(
    "login without IP has valid refresh token",
    !!loginWithoutIP.token.refresh,
  );

  // Step 5: Test login with IP field explicitly set to null
  const loginWithNullIP: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email,
        password,
        ip: null,
        href,
        referrer,
      } satisfies ITodoListUser.ILogin,
    });
  typia.assert(loginWithNullIP);

  TestValidator.equals(
    "login with null IP email matches",
    loginWithNullIP.email,
    email,
  );
  TestValidator.predicate(
    "login with null IP has valid access token",
    !!loginWithNullIP.token.access,
  );
  TestValidator.predicate(
    "login with null IP has valid refresh token",
    !!loginWithNullIP.token.refresh,
  );

  // Verify all logins returned valid user IDs
  TestValidator.equals(
    "all logins return same user ID",
    loginWithIPv4.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "IPv6 login returns same user ID",
    loginWithIPv6.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "login without IP returns same user ID",
    loginWithoutIP.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "login with null IP returns same user ID",
    loginWithNullIP.id,
    registeredUser.id,
  );
}
