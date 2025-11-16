import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator authentication login with valid credentials and token
 * validation.
 *
 * This test validates that moderator accounts can successfully authenticate
 * with correct credentials and receive valid JWT tokens for subsequent API
 * requests. The test workflow:
 *
 * 1. Create a moderator account with valid credentials
 * 2. Verify the account is in active status
 * 3. Login with the correct email and password
 * 4. Validate that authentication returns access and refresh tokens
 * 5. Verify the returned moderator data matches the created account
 * 6. Confirm token expiration times are properly set
 *
 * This ensures that the authentication system properly validates credentials
 * and issues valid tokens for moderator access to community management tools.
 */
export async function test_api_moderator_authentication_login_suspended_account(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(8);
  const password = "SecurePassword123!";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const createdModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email,
        username,
        password,
        href,
        referrer,
      } satisfies ICommunityPlatformModerator.ICreate,
    },
  );
  typia.assert(createdModerator);

  // Step 2: Verify the moderator was created with active status
  TestValidator.equals(
    "moderator email matches created account",
    createdModerator.email,
    email,
  );
  TestValidator.equals(
    "moderator username matches created account",
    createdModerator.username,
    username,
  );
  TestValidator.equals(
    "initial account status should be active",
    createdModerator.account_status,
    "active",
  );

  // Step 3: Login with correct email and password
  const authenticatedViaEmail = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies ICommunityPlatformModerator.ILogin,
    },
  );
  typia.assert(authenticatedViaEmail);

  // Step 4: Validate authentication response contains tokens
  TestValidator.predicate(
    "access token should be issued",
    authenticatedViaEmail.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be issued",
    authenticatedViaEmail.token.refresh.length > 0,
  );

  // Step 5: Verify moderator data matches created account
  TestValidator.equals(
    "authenticated moderator email matches",
    authenticatedViaEmail.email,
    email,
  );
  TestValidator.equals(
    "authenticated moderator username matches",
    authenticatedViaEmail.username,
    username,
  );
  TestValidator.equals(
    "authenticated moderator id matches",
    authenticatedViaEmail.id,
    createdModerator.id,
  );

  // Step 6: Verify token expiration times are set
  TestValidator.predicate(
    "access token expiration should be in future",
    new Date(authenticatedViaEmail.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token should be refreshable until future date",
    new Date(authenticatedViaEmail.token.refreshable_until) > new Date(),
  );

  // Step 7: Verify login also works with username
  const authenticatedViaUsername = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        username,
        password,
        href,
        referrer,
      } satisfies ICommunityPlatformModerator.ILogin,
    },
  );
  typia.assert(authenticatedViaUsername);

  TestValidator.equals(
    "login via username should return same moderator",
    authenticatedViaUsername.id,
    createdModerator.id,
  );

  // Step 8: Verify that incorrect password is rejected
  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email,
          password: "WrongPassword123!",
          href,
          referrer,
        } satisfies ICommunityPlatformModerator.ILogin,
      });
    },
  );
}
