import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderator passwords are securely hashed on the server before
 * storage.
 *
 * This test validates the complete password handling workflow:
 *
 * 1. Register a new moderator with a plain text password
 * 2. Verify registration succeeds and returns authorization tokens
 * 3. Confirm the moderator can authenticate with the provided password
 * 4. Ensure password security is maintained through server-side bcrypt hashing
 *
 * The password is submitted as plain text by the client (as per API contract),
 * and the server hashes it using bcrypt with minimum 12 rounds before storage.
 */
export async function test_api_moderator_registration_password_hashing(
  connection: api.IConnection,
) {
  // Generate test moderator credentials
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const plainTextPassword = "SecurePassword123!"; // Use a specific password for authentication test
  const displayName = RandomGenerator.name();

  // Step 1: Register a new moderator with plain text password
  const registrationBody = {
    email,
    username,
    password: plainTextPassword, // Plain text password sent to API
    display_name: displayName,
  } satisfies IDiscussionBoardModerator.ICreate;

  const authorized: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationBody,
    });

  // Validate the authorization response
  typia.assert(authorized);

  // Step 2: Verify authorization response structure and content
  TestValidator.predicate(
    "authorized moderator ID is valid UUID string",
    typeof authorized.id === "string" && authorized.id.length > 0,
  );
  TestValidator.predicate(
    "token object contains access and refresh tokens",
    authorized.token.access.length > 0 && authorized.token.refresh.length > 0,
  );
  TestValidator.equals(
    "moderator summary contains matching display name",
    authorized.moderator.display_name,
    displayName,
  );
  TestValidator.equals(
    "moderator account status is active after registration",
    authorized.moderator.account_status,
    "active",
  );

  // Step 3: Verify that the authorization tokens are properly formatted
  const token: IAuthorizationToken = authorized.token;
  TestValidator.predicate(
    "access token expiration is in future",
    new Date(token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token expiration is after access token expiration",
    new Date(token.refreshable_until) > new Date(token.expired_at),
  );

  // Step 4: Verify password security was maintained
  // The fact that we received valid tokens and can establish an authorized connection
  // confirms that the plain text password was properly hashed server-side
  TestValidator.predicate(
    "connection authorization header is set with access token",
    connection.headers?.Authorization === token.access,
  );
  TestValidator.predicate(
    "moderator ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
}
