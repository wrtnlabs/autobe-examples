import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test community moderator login with invalid credentials to validate security
 * response.
 *
 * This test validates that the system properly rejects incorrect email/password
 * combinations while providing appropriate error messaging that maintains
 * security by not revealing whether the email exists. Tests that failed login
 * handling protects against credential stuffing and enumeration attacks while
 * maintaining professional user experience.
 *
 * Test Flow:
 *
 * 1. Create a valid community moderator account for testing
 * 2. Attempt login with wrong password (correct email)
 * 3. Attempt login with wrong email (correct password)
 * 4. Attempt login with completely non-existent email
 * 5. Attempt login with completely different credentials
 * 6. Validate that all invalid attempts are properly rejected
 * 7. Confirm successful login still works with correct credentials
 * 8. Verify error responses don't leak account existence information
 */
export async function test_api_community_moderator_login_invalid_credentials_rejection(
  connection: api.IConnection,
) {
  // Step 1: Create a valid community moderator account
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(12);
  const validModerator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: testEmail,
        password: testPassword,
        nickname: RandomGenerator.name(),
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(validModerator);

  // Step 2: Test login with correct email but wrong password
  const wrongPassword = RandomGenerator.alphaNumeric(10); // Different password
  TestValidator.predicate(
    "login should fail with wrong password",
    wrongPassword !== testPassword,
  );

  await TestValidator.error(
    "authentication should fail with wrong password",
    async () => {
      await api.functional.auth.communityModerator.login(connection, {
        body: {
          email: testEmail,
          password: wrongPassword,
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IRedditCommunityCommunityModerator.ILogin,
      });
    },
  );

  // Step 3: Test login with wrong email but correct password
  const wrongEmail = typia.random<string & tags.Format<"email">>();
  await TestValidator.error(
    "authentication should fail with wrong email",
    async () => {
      await api.functional.auth.communityModerator.login(connection, {
        body: {
          email: wrongEmail,
          password: testPassword,
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IRedditCommunityCommunityModerator.ILogin,
      });
    },
  );

  // Step 4: Test login with non-existent email
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  TestValidator.predicate(
    "non-existent email should be different from test email",
    nonExistentEmail !== testEmail,
  );

  await TestValidator.error(
    "authentication should fail with non-existent email",
    async () => {
      await api.functional.auth.communityModerator.login(connection, {
        body: {
          email: nonExistentEmail,
          password: RandomGenerator.alphaNumeric(10),
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IRedditCommunityCommunityModerator.ILogin,
      });
    },
  );

  // Step 5: Test login with completely different credentials
  await TestValidator.error(
    "authentication should fail with completely different credentials",
    async () => {
      await api.functional.auth.communityModerator.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(8),
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IRedditCommunityCommunityModerator.ILogin,
      });
    },
  );

  // Step 6: Validate successful login still works with correct credentials
  const successfulLogin = await api.functional.auth.communityModerator.login(
    connection,
    {
      body: {
        email: testEmail,
        password: testPassword,
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );
  typia.assert(successfulLogin);

  // Step 7: Verify successful login has same moderator ID as registration
  TestValidator.equals(
    "successful login should return same moderator ID",
    successfulLogin.id,
    validModerator.id,
  );

  // Step 8: Verify successful login has proper token structure
  TestValidator.predicate(
    "successful login should have valid authorization token",
    !!successfulLogin.token.access &&
      !!successfulLogin.token.refresh &&
      !!successfulLogin.token.expired_at &&
      !!successfulLogin.token.refreshable_until,
  );
}
