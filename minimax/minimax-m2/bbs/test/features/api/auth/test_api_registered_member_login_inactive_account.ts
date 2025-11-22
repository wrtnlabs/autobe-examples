import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionRegisteredMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionRegisteredMember";

/**
 * Test authentication behavior for inactive or suspended user accounts in the
 * economic and political discussion board system. This test validates that the
 * system properly enforces account status restrictions and prevents inactive
 * accounts from accessing member-only features. The test creates a registered
 * member account, simulates account deactivation scenarios, and verifies that
 * authentication endpoints correctly reject login attempts for non-active
 * accounts. This ensures proper access control and account lifecycle management
 * for community participation features.
 */
export async function test_api_registered_member_login_inactive_account(
  connection: api.IConnection,
) {
  // Generate test user data for economic/political discussion board
  const testEmail = `test.user.${RandomGenerator.alphaNumeric(8)}@example.com`;
  const displayName = RandomGenerator.name(2);
  const password = "TestPassword123!";

  // Step 1: Create a registered member account with active status
  const activeUser = await api.functional.auth.registeredMember.join(
    connection,
    {
      body: {
        display_name: displayName,
        email: testEmail,
        bio: "Economic analyst interested in political discourse",
        avatar_url: `https://example.com/avatar/${RandomGenerator.alphaNumeric(8)}.jpg`,
        status: "active",
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    },
  );
  typia.assert(activeUser);
  TestValidator.equals(
    "active user created successfully",
    activeUser.status,
    "active",
  );

  // Step 2: Verify successful login with active account
  const loginResponse = await api.functional.auth.registeredMember.login(
    connection,
    {
      body: {
        email: testEmail,
        password: password,
        ip: "192.168.1.100",
        href: "https://discussion-board.example.com/login",
        referrer: "https://discussion-board.example.com/home",
      } satisfies IEconPoliticalDiscussionRegisteredMember.ILogin,
    },
  );
  typia.assert(loginResponse);
  TestValidator.equals(
    "successful login with active account",
    loginResponse.status,
    "active",
  );
  TestValidator.equals(
    "user profile matches",
    loginResponse.display_name,
    displayName,
  );

  // Step 3: Create a second user account to test inactive status simulation
  const inactiveTestEmail = `inactive.user.${RandomGenerator.alphaNumeric(8)}@example.com`;
  const inactiveDisplayName = RandomGenerator.name(2);

  const inactiveUser = await api.functional.auth.registeredMember.join(
    connection,
    {
      body: {
        display_name: inactiveDisplayName,
        email: inactiveTestEmail,
        bio: "Suspended political commentator",
        avatar_url: `https://example.com/avatar/${RandomGenerator.alphaNumeric(8)}.jpg`,
        status: "suspended", // Testing with suspended status
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    },
  );
  typia.assert(inactiveUser);

  // Step 4: Test that login fails for suspended/inactive accounts
  await TestValidator.error(
    "login should fail for suspended account",
    async () => {
      await api.functional.auth.registeredMember.login(connection, {
        body: {
          email: inactiveTestEmail,
          password: password,
          ip: "192.168.1.101",
          href: "https://discussion-board.example.com/login",
          referrer: "https://discussion-board.example.com/home",
        } satisfies IEconPoliticalDiscussionRegisteredMember.ILogin,
      });
    },
  );

  // Step 5: Test additional authentication failure scenarios
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.registeredMember.login(connection, {
        body: {
          email: testEmail,
          password: "WrongPassword123!",
          ip: "192.168.1.100",
          href: "https://discussion-board.example.com/login",
          referrer: "https://discussion-board.example.com/home",
        } satisfies IEconPoliticalDiscussionRegisteredMember.ILogin,
      });
    },
  );

  // Step 6: Test with non-existent email to simulate invalid account
  await TestValidator.error(
    "login should fail with non-existent email",
    async () => {
      await api.functional.auth.registeredMember.login(connection, {
        body: {
          email: `nonexistent.${RandomGenerator.alphaNumeric(8)}@example.com`,
          password: password,
          ip: "192.168.1.100",
          href: "https://discussion-board.example.com/login",
          referrer: "https://discussion-board.example.com/home",
        } satisfies IEconPoliticalDiscussionRegisteredMember.ILogin,
      });
    },
  );

  // Step 7: Verify that active account can still login after testing inactive scenarios
  const finalLoginResponse = await api.functional.auth.registeredMember.login(
    connection,
    {
      body: {
        email: testEmail,
        password: password,
        ip: "192.168.1.102",
        href: "https://discussion-board.example.com/login",
        referrer: "https://discussion-board.example.com/home",
      } satisfies IEconPoliticalDiscussionRegisteredMember.ILogin,
    },
  );
  typia.assert(finalLoginResponse);
  TestValidator.equals(
    "active account remains accessible",
    finalLoginResponse.status,
    "active",
  );
  TestValidator.equals(
    "user profile still valid",
    finalLoginResponse.display_name,
    displayName,
  );
}
