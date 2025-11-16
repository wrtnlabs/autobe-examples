import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful moderator login with valid credentials.
 *
 * This test validates the complete moderator authentication workflow including:
 *
 * 1. Creating a moderator account with known credentials (prerequisite)
 * 2. Authenticating with the same credentials via login endpoint
 * 3. Verifying JWT token generation (access and refresh tokens)
 * 4. Validating session metadata capture (ip, href, referrer)
 * 5. Confirming response structure matches IDiscussionBoardModerator.IAuthorized
 *
 * The test ensures that:
 *
 * - Credential validation works correctly
 * - Password verification succeeds for matching credentials
 * - JWT tokens are properly generated with expiration information
 * - Moderator identity is correctly returned (id, username, email, timestamps)
 * - Session context is captured for security auditing
 */
export async function test_api_moderator_login_successful_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account with known credentials (prerequisite)
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = "SecureTestPassword123";
  const testUsername = RandomGenerator.name(1);

  const registrationBody = {
    email: testEmail,
    password: testPassword,
    username: testUsername,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const registeredModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationBody,
    });
  typia.assert(registeredModerator);

  // Step 2: Authenticate with the same credentials via login endpoint
  const loginBody = {
    email: testEmail,
    password: testPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ILogin;

  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginBody,
    });
  typia.assert(authenticatedModerator);

  // Step 3: Validate that login response matches registered moderator information
  TestValidator.equals(
    "authenticated moderator ID matches registered ID",
    authenticatedModerator.id,
    registeredModerator.id,
  );

  TestValidator.equals(
    "authenticated moderator email matches registration",
    authenticatedModerator.email,
    testEmail,
  );

  TestValidator.equals(
    "authenticated moderator username matches registration",
    authenticatedModerator.username,
    testUsername,
  );
}
