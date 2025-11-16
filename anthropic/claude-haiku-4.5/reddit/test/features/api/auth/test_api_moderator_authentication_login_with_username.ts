import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator authentication using username as account identifier instead of
 * email.
 *
 * This test validates that the moderator login endpoint accepts both email and
 * username as alternative account identifiers. The test creates a new moderator
 * account with known credentials, then performs login using the username
 * instead of email, and verifies that the authentication returns valid
 * moderator information with properly issued JWT tokens.
 *
 * Test workflow:
 *
 * 1. Generate test moderator credentials (email, username, password)
 * 2. Register a new moderator account using the join endpoint
 * 3. Authenticate using the username (instead of email) with the same password
 * 4. Verify the login response contains valid moderator data and JWT tokens
 * 5. Confirm that the authenticated moderator matches the created account
 */
export async function test_api_moderator_authentication_login_with_username(
  connection: api.IConnection,
) {
  // Step 1: Generate test credentials for moderator account
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testUsername = RandomGenerator.alphabets(8);
  const testPassword = RandomGenerator.alphaNumeric(12);
  const testHref = "https://example.com/auth/register";
  const testReferrer = "https://example.com";

  // Step 2: Create a moderator account using the join endpoint
  const createdModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: testEmail,
        username: testUsername,
        password: testPassword,
        href: testHref,
        referrer: testReferrer,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(createdModerator);

  // Step 3: Create a fresh connection for login testing (without existing auth header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 4: Authenticate using username instead of email
  const authenticatedModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.login(unauthConn, {
      body: {
        username: testUsername,
        password: testPassword,
        href: testHref,
        referrer: testReferrer,
      } satisfies ICommunityPlatformModerator.ILogin,
    });
  typia.assert(authenticatedModerator);

  // Step 5: Verify the authenticated moderator matches the created account
  TestValidator.equals(
    "authenticated moderator ID should match created account",
    authenticatedModerator.id,
    createdModerator.id,
  );

  TestValidator.equals(
    "authenticated moderator username should match created account",
    authenticatedModerator.username,
    createdModerator.username,
  );

  TestValidator.equals(
    "authenticated moderator email should match created account",
    authenticatedModerator.email,
    createdModerator.email,
  );

  // Step 6: Verify JWT tokens are present and valid
  TestValidator.predicate(
    "access token should be present",
    authenticatedModerator.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be present",
    authenticatedModerator.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "access token expiration should be a valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      authenticatedModerator.token.expired_at,
    ),
  );

  TestValidator.predicate(
    "refresh token refreshable_until should be a valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      authenticatedModerator.token.refreshable_until,
    ),
  );
}
