import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate administrator login properly captures session context information.
 *
 * Tests that the administrator login endpoint records session context details
 * including href (current page URL), referrer (HTTP referrer), and ip (client
 * IP) for security auditing and session tracking. These context fields are
 * essential for compliance monitoring and investigating administrative access
 * patterns.
 *
 * Test workflow:
 *
 * 1. Create a new administrator account with session context
 * 2. Login with the created credentials and session context
 * 3. Verify login response contains complete authorization data
 * 4. Test with explicit IP address provided
 * 5. Test with null IP (server extracts from request headers)
 */
export async function test_api_administrator_login_session_context_capture(
  connection: api.IConnection,
) {
  // Generate test data for administrator account creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12); // At least 8 characters required
  const adminUsername = RandomGenerator.alphabets(8);
  const adminName = RandomGenerator.name();
  const sessionHref = "https://admin.example.com/login";
  const sessionReferrer = "https://example.com";
  const clientIP = "192.168.1.100";

  // Step 1: Create administrator account with session context
  const createResponse = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: sessionHref,
        referrer: sessionReferrer,
        ip: clientIP,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(createResponse);

  // Verify the created administrator has valid authorization data
  TestValidator.equals(
    "admin created with valid ID",
    typeof createResponse.id,
    "string",
  );
  TestValidator.equals("admin email matches", createResponse.email, adminEmail);
  TestValidator.equals(
    "admin username matches",
    createResponse.username,
    adminUsername,
  );
  TestValidator.predicate(
    "admin account is active",
    () => createResponse.account_status === "active",
  );
  TestValidator.predicate("admin has valid created_at timestamp", () => {
    return (
      createResponse.created_at !== undefined &&
      createResponse.created_at.length > 0 &&
      !isNaN(Date.parse(createResponse.created_at))
    );
  });
  TestValidator.predicate("admin tokens present with valid content", () => {
    return (
      createResponse.token !== null &&
      createResponse.token !== undefined &&
      createResponse.token.access.length > 0 &&
      createResponse.token.refresh.length > 0
    );
  });

  // Step 2: Login with explicit IP address provided
  const loginResponseWithIP = await api.functional.auth.administrator.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: sessionHref,
        referrer: sessionReferrer,
        ip: clientIP,
      } satisfies ICommunityPlatformAdministrator.ILogin,
    },
  );
  typia.assert(loginResponseWithIP);

  // Verify login response contains complete authorization information
  TestValidator.equals(
    "login response has matching ID",
    loginResponseWithIP.id,
    createResponse.id,
  );
  TestValidator.equals(
    "login email matches input",
    loginResponseWithIP.email,
    adminEmail,
  );
  TestValidator.equals(
    "login username matches",
    loginResponseWithIP.username,
    adminUsername,
  );
  TestValidator.predicate(
    "login account is active",
    () => loginResponseWithIP.account_status === "active",
  );
  TestValidator.predicate("login has valid created_at timestamp", () => {
    return (
      loginResponseWithIP.created_at !== undefined &&
      loginResponseWithIP.created_at.length > 0
    );
  });
  TestValidator.predicate(
    "login response has access token with content",
    () => {
      return (
        loginResponseWithIP.token.access !== undefined &&
        loginResponseWithIP.token.access.length > 0
      );
    },
  );
  TestValidator.predicate(
    "login response has refresh token with content",
    () => {
      return (
        loginResponseWithIP.token.refresh !== undefined &&
        loginResponseWithIP.token.refresh.length > 0
      );
    },
  );
  TestValidator.predicate("login response has valid token expiration", () => {
    return (
      loginResponseWithIP.token.expired_at !== undefined &&
      loginResponseWithIP.token.expired_at.length > 0 &&
      !isNaN(Date.parse(loginResponseWithIP.token.expired_at))
    );
  });
  TestValidator.predicate("login response has valid refresh expiration", () => {
    return (
      loginResponseWithIP.token.refreshable_until !== undefined &&
      loginResponseWithIP.token.refreshable_until.length > 0 &&
      !isNaN(Date.parse(loginResponseWithIP.token.refreshable_until))
    );
  });

  // Step 3: Login with null IP (server extracts from request headers)
  const loginResponseWithoutIP = await api.functional.auth.administrator.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: sessionHref,
        referrer: sessionReferrer,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ILogin,
    },
  );
  typia.assert(loginResponseWithoutIP);

  // Verify login without explicit IP also succeeds and returns valid tokens
  TestValidator.equals(
    "login without IP has matching ID",
    loginResponseWithoutIP.id,
    createResponse.id,
  );
  TestValidator.equals(
    "login without IP email matches",
    loginResponseWithoutIP.email,
    adminEmail,
  );
  TestValidator.predicate(
    "login without IP has access token with content",
    () => {
      return (
        loginResponseWithoutIP.token.access !== undefined &&
        loginResponseWithoutIP.token.access.length > 0
      );
    },
  );
  TestValidator.predicate(
    "login without IP has refresh token with content",
    () => {
      return (
        loginResponseWithoutIP.token.refresh !== undefined &&
        loginResponseWithoutIP.token.refresh.length > 0
      );
    },
  );

  // Step 4: Verify both login scenarios return consistent authentication data
  TestValidator.equals(
    "both logins return same admin ID",
    loginResponseWithIP.id,
    loginResponseWithoutIP.id,
  );
  TestValidator.equals(
    "both logins return same email",
    loginResponseWithIP.email,
    loginResponseWithoutIP.email,
  );
  TestValidator.equals(
    "both logins return same username",
    loginResponseWithIP.username,
    loginResponseWithoutIP.username,
  );
  TestValidator.equals(
    "both logins return same account status",
    loginResponseWithIP.account_status,
    loginResponseWithoutIP.account_status,
  );
  TestValidator.predicate(
    "both login responses contain valid session tokens",
    () => {
      return (
        loginResponseWithIP.token.access.length > 0 &&
        loginResponseWithIP.token.refresh.length > 0 &&
        loginResponseWithoutIP.token.access.length > 0 &&
        loginResponseWithoutIP.token.refresh.length > 0
      );
    },
  );
}
