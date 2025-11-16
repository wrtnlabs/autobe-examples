import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test administrator login authentication and account state validation.
 *
 * This test validates administrator authentication workflows and account state
 * handling. The test creates a new administrator account and verifies the login
 * process works correctly with valid credentials. It also tests that login
 * fails with invalid credentials.
 *
 * The workflow demonstrates:
 *
 * 1. Create a new administrator account with valid credentials
 * 2. Verify the account was created successfully and is in active state
 * 3. Verify login succeeds with valid credentials
 * 4. Verify login fails with incorrect password
 * 5. Confirm account state management for authentication scenarios
 *
 * This test ensures proper authentication handling and account lifecycle
 * management for administrator accounts on the platform.
 */
export async function test_api_administrator_login_deleted_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account with valid credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminName = RandomGenerator.name();

  const createdAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "https://example.com/admin/register",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 2: Verify the account was created successfully and is in active state
  TestValidator.equals(
    "created admin account status should be active",
    createdAdmin.account_status,
    "active",
  );
  TestValidator.predicate(
    "created admin should have valid email",
    createdAdmin.email === adminEmail,
  );
  TestValidator.predicate(
    "created admin should have valid username",
    createdAdmin.username === adminUsername,
  );
  TestValidator.predicate(
    "deleted_at should be null for new account",
    createdAdmin.deleted_at === null || createdAdmin.deleted_at === undefined,
  );

  // Step 3: Create fresh connection for login test without existing auth token
  const loginConnection: api.IConnection = { ...connection, headers: {} };

  // Step 4: Verify login succeeds with valid credentials
  const loginResponse: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(loginConnection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: "https://example.com/admin/login",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ILogin,
    });
  typia.assert(loginResponse);

  TestValidator.equals(
    "login response should have same admin id",
    loginResponse.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "login response should have same email",
    loginResponse.email,
    adminEmail,
  );
  TestValidator.predicate(
    "login should return active account status",
    loginResponse.account_status === "active",
  );

  // Step 5: Verify login fails with incorrect password
  const wrongPasswordConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.administrator.login(wrongPasswordConnection, {
        body: {
          email: adminEmail,
          password: "wrongpassword123",
          href: "https://example.com/admin/login",
          referrer: "https://example.com",
          ip: "192.168.1.1",
        } satisfies ICommunityPlatformAdministrator.ILogin,
      });
    },
  );
}
