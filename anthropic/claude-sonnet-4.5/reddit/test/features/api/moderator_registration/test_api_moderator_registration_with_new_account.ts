import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test moderator registration with new account creation.
 *
 * This test validates the complete moderator registration workflow including:
 *
 * 1. Creating a new moderator account with valid credentials
 * 2. Verifying the response includes moderator profile and JWT tokens
 * 3. Confirming the access token is automatically set for authenticated requests
 * 4. Validating that email_verified is initially false
 * 5. Ensuring the account can be used immediately without separate login
 *
 * The registration requires:
 *
 * - Username: 3-20 characters, alphanumeric with underscores/hyphens
 * - Email: Valid email format, must be unique
 * - Password: Minimum 8 characters (backend hashes it securely)
 *
 * The response provides:
 *
 * - Access token with 30-minute expiration
 * - Refresh token with 30-day expiration
 * - Complete moderator profile information
 */
export async function test_api_moderator_registration_with_new_account(
  connection: api.IConnection,
) {
  // Generate valid moderator registration data
  const username = RandomGenerator.alphaNumeric(12);
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);

  const registrationData = {
    username: username,
    email: email,
    password: password,
  } satisfies IRedditLikeModerator.ICreate;

  // Register new moderator account
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });

  // Validate the response structure (performs complete type validation including UUID format, date-time format, etc.)
  typia.assert(moderator);

  // Verify business logic: moderator profile information matches input
  TestValidator.equals(
    "username matches registration input",
    moderator.username,
    username,
  );
  TestValidator.equals(
    "email matches registration input",
    moderator.email,
    email,
  );
  TestValidator.equals(
    "email_verified should be false initially",
    moderator.email_verified,
    false,
  );

  // Verify SDK behavior: access token was automatically set in connection headers
  TestValidator.equals(
    "access token should be set in connection headers",
    connection.headers?.Authorization,
    moderator.token.access,
  );
}
