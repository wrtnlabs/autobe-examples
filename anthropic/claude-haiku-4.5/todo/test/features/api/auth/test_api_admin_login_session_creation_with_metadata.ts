import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_admin_login_session_creation_with_metadata(
  connection: api.IConnection,
) {
  // Step 1: Register an admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  const registeredAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      password_confirmation: adminPassword,
    } satisfies ITodoAppAdmin.IRegister,
  });
  typia.assert(registeredAdmin);
  TestValidator.equals(
    "registered admin email matches",
    registeredAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "registered admin status is active",
    registeredAdmin.status,
    "active",
  );

  // Step 2: Create connection metadata for login
  const ipAddress = "192.168.1.100";
  const hrefUrl = "https://todoapp.example.com/admin/login";
  const referrerUrl = "https://todoapp.example.com/";

  // Step 3: Create a fresh connection for login (without existing auth)
  const loginConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4: Perform admin login with metadata
  const loginResponse = await api.functional.auth.admin.login(loginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: ipAddress,
      href: hrefUrl,
      referrer: referrerUrl,
    } satisfies ITodoAppAdmin.ILogin,
  });
  typia.assert(loginResponse);

  // Step 5: Validate login response structure
  TestValidator.equals(
    "login response email matches",
    loginResponse.email,
    adminEmail,
  );
  TestValidator.equals(
    "login response status is active",
    loginResponse.status,
    "active",
  );

  // Validate timestamps are valid ISO date-time formats
  TestValidator.predicate("created_at is valid ISO date-time", () => {
    const date = new Date(loginResponse.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid ISO date-time", () => {
    const date = new Date(loginResponse.updated_at);
    return !isNaN(date.getTime());
  });

  // Step 6: Validate authorization token
  typia.assert<IAuthorizationToken>(loginResponse.token);

  const expiredAt = new Date(loginResponse.token.expired_at);
  const now = new Date();
  TestValidator.predicate(
    "access token expiration is in future",
    expiredAt.getTime() > now.getTime(),
  );

  const refreshableUntil = new Date(loginResponse.token.refreshable_until);
  TestValidator.predicate(
    "refresh token expiration is in future",
    refreshableUntil.getTime() > now.getTime(),
  );

  // Validate that access token expiration is approximately 30 minutes from now
  const thirtyMinutesMs = 30 * 60 * 1000;
  const expirationDiff = expiredAt.getTime() - now.getTime();
  TestValidator.predicate(
    "access token expires within 30 minutes",
    expirationDiff > 0 && expirationDiff <= thirtyMinutesMs + 5000,
  );

  // Step 7: Verify login with same credentials succeeds (session metadata re-captured with different IP/URL)
  const loginConnection2: api.IConnection = {
    ...connection,
    headers: {},
  };

  const secondLoginResponse = await api.functional.auth.admin.login(
    loginConnection2,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "192.168.1.101",
        href: "https://todoapp.example.com/admin/dashboard",
        referrer: "https://todoapp.example.com/admin/login",
      } satisfies ITodoAppAdmin.ILogin,
    },
  );
  typia.assert(secondLoginResponse);

  // Step 8: Validate that subsequent login returns same admin
  TestValidator.equals(
    "second login admin id matches first login",
    secondLoginResponse.id,
    loginResponse.id,
  );
  TestValidator.equals(
    "second login email matches",
    secondLoginResponse.email,
    adminEmail,
  );
  TestValidator.equals(
    "second login status is active",
    secondLoginResponse.status,
    "active",
  );

  // Verify that timestamps are valid for the second login
  TestValidator.predicate(
    "second login created_at is valid ISO date-time",
    () => {
      const date = new Date(secondLoginResponse.created_at);
      return !isNaN(date.getTime());
    },
  );
  TestValidator.predicate(
    "second login updated_at is valid ISO date-time",
    () => {
      const date = new Date(secondLoginResponse.updated_at);
      return !isNaN(date.getTime());
    },
  );

  // Verify second login returns valid token
  typia.assert<IAuthorizationToken>(secondLoginResponse.token);
  const secondExpiredAt = new Date(secondLoginResponse.token.expired_at);
  TestValidator.predicate(
    "second login access token expiration is in future",
    secondExpiredAt.getTime() > new Date().getTime(),
  );
}
