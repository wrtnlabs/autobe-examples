import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful termination of current administrator session and logout
 * operation.
 *
 * This test validates the complete logout workflow:
 *
 * 1. Create a new administrator account via join endpoint to establish an
 *    authenticated session
 * 2. Verify administrator is successfully authenticated with valid JWT tokens
 * 3. Invoke logout endpoint to terminate the current administrator session
 * 4. Verify logout response confirms successful session termination
 * 5. Validate that subsequent API calls using invalidated session token are
 *    rejected
 */
export async function test_api_administrator_logout_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account and establish authenticated session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123";
  const adminUsername = RandomGenerator.alphabets(10);
  const adminName = RandomGenerator.name();
  const currentHref = "http://localhost:3000/admin/login";

  const authorized: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: currentHref,
        referrer: undefined,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(authorized);

  // Step 2: Verify administrator is successfully authenticated with valid tokens
  TestValidator.predicate(
    "administrator account created successfully",
    authorized.id !== null && authorized.id !== undefined,
  );
  TestValidator.predicate(
    "administrator has valid access token",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "administrator has valid refresh token",
    authorized.token.refresh.length > 0,
  );
  TestValidator.equals(
    "administrator email matches registration email",
    authorized.email,
    adminEmail,
  );
  TestValidator.predicate(
    "administrator account is active",
    authorized.account_status === "active",
  );

  // Step 3: Invoke logout endpoint to terminate the current administrator session
  const logoutResponse: ICommunityPlatformAdministrator.ILogoutResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.logout(
      connection,
    );
  typia.assert(logoutResponse);

  // Step 4: Verify logout response confirms successful session termination
  TestValidator.predicate(
    "logout operation completed successfully",
    logoutResponse.success === true,
  );
  TestValidator.predicate(
    "logout response contains confirmation message",
    logoutResponse.message.length > 0,
  );

  // Step 5: Validate that subsequent API calls using invalidated session token are rejected
  // Create a new connection with the old (now invalid) authorization header
  const invalidatedConnection: api.IConnection = {
    ...connection,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };

  // Attempt to call logout again with invalidated session - should fail
  await TestValidator.error(
    "subsequent API calls with invalidated token are rejected",
    async () => {
      await api.functional.communityPlatform.administrator.auth.administrator.logout(
        invalidatedConnection,
      );
    },
  );
}
