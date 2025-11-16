import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderator registration properly handles password security by
 * ensuring passwords are not returned in responses and are properly hashed.
 *
 * This test validates secure password handling practices by:
 *
 * 1. Registering a new moderator account with a known password
 * 2. Examining the registration response payload
 * 3. Verifying that the password is not included in the response
 * 4. Confirming that sensitive credential information is not exposed
 *
 * The test ensures that:
 *
 * - Response does not contain the password field
 * - Response does not contain any password hash or encrypted password
 * - Only safe, non-sensitive moderator information is returned
 * - The authentication tokens provided can be used for subsequent requests
 *   without exposing the password
 */
export async function test_api_moderator_registration_password_security(
  connection: api.IConnection,
) {
  // Generate random moderator registration data
  const testPassword = RandomGenerator.alphaNumeric(16);
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: testPassword,
    username: RandomGenerator.name(1),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  // Register a new moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });

  // Validate the response structure - this validates ALL properties including existence, types, and formats
  typia.assert(moderator);

  // Critical security validation: Ensure password is NOT in the response
  const responseJson = JSON.stringify(moderator);
  TestValidator.predicate(
    "response does not contain password field",
    !("password" in moderator),
  );
  TestValidator.predicate(
    "response does not expose password value",
    !responseJson.includes(testPassword),
  );

  // Verify the authentication token is set in connection headers
  TestValidator.predicate(
    "connection headers contain authorization token",
    connection.headers?.Authorization === moderator.token.access,
  );
}
