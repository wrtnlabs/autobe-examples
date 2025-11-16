import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test authentication for administrators with different privilege levels.
 *
 * This test validates that the admin authentication system works consistently
 * across all administrator privilege levels. It creates three admin accounts
 * with different admin_level values (super_admin, moderator, and support),
 * authenticates each account using their respective credentials, and verifies
 * that login succeeds for all privilege levels with correct privilege
 * information returned in the authentication response.
 *
 * Process:
 *
 * 1. Create super_admin account with admin_level "super_admin"
 * 2. Create moderator account with admin_level "moderator"
 * 3. Create support account with admin_level "support"
 * 4. Authenticate super_admin account and verify admin_level in response
 * 5. Authenticate moderator account and verify admin_level in response
 * 6. Authenticate support account and verify admin_level in response
 */
export async function test_api_admin_authentication_multiple_privilege_levels(
  connection: api.IConnection,
) {
  // Define privilege levels to test
  const privilegeLevels = ["super_admin", "moderator", "support"] as const;

  // Store account credentials for login testing
  const accounts: Array<{
    email: string;
    password: string;
    expectedLevel: "super_admin" | "moderator" | "support";
  }> = [];

  // Step 1-3: Create admin accounts with different privilege levels
  for (const adminLevel of privilegeLevels) {
    const email = typia.random<string & tags.Format<"email">>();
    const password = "SecurePassword123!";

    const createBody = {
      email: email,
      password: password,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: adminLevel,
      email_verified: true,
      href: "https://admin.example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://admin.example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IShoppingMallAdmin.ICreate;

    const createdAdmin = await api.functional.auth.admin.join(connection, {
      body: createBody,
    });

    typia.assert(createdAdmin);

    // Verify the created account has the correct privilege level
    TestValidator.equals(
      `created ${adminLevel} account has correct admin_level`,
      createdAdmin.admin_level,
      adminLevel,
    );

    // Store credentials for login testing
    accounts.push({
      email: email,
      password: password,
      expectedLevel: adminLevel,
    });
  }

  // Step 4-6: Authenticate each account and verify privilege levels
  for (const account of accounts) {
    const loginBody = {
      email: account.email,
      password: account.password,
      href: "https://admin.example.com/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://admin.example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IShoppingMallAdmin.ILogin;

    const authenticatedAdmin = await api.functional.auth.admin.login(
      connection,
      {
        body: loginBody,
      },
    );

    typia.assert(authenticatedAdmin);

    // Verify the authenticated response contains the correct admin_level
    TestValidator.equals(
      `authenticated ${account.expectedLevel} account has correct admin_level`,
      authenticatedAdmin.admin_level,
      account.expectedLevel,
    );

    // Verify authentication token is present
    TestValidator.predicate(
      `${account.expectedLevel} authentication includes access token`,
      authenticatedAdmin.token.access.length > 0,
    );

    // Verify email matches
    TestValidator.equals(
      `${account.expectedLevel} authenticated email matches`,
      authenticatedAdmin.email,
      account.email,
    );
  }
}
