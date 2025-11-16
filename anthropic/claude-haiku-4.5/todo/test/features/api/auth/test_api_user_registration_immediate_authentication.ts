import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that JWT tokens returned from registration are immediately usable for
 * authenticated API requests.
 *
 * After successful registration, use the returned access token to make
 * authenticated requests, verifying that no additional login step is required.
 * Validate that the token payload contains the correct user ID and that
 * subsequent requests are properly authenticated.
 *
 * Steps:
 *
 * 1. Register a new user with valid email, password, href, and referrer
 * 2. Verify the registration response contains user ID and JWT tokens
 * 3. Confirm the access token is set in connection headers
 * 4. Verify token payload contains correct user ID and email
 * 5. Make authenticated API requests using the returned token
 * 6. Validate that subsequent requests are properly authenticated
 */
export async function test_api_user_registration_immediate_authentication(
  connection: api.IConnection,
) {
  // Step 1: Register a new user with valid credentials
  const registrationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12), // Minimum 8 characters required
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppUser.ICreate;

  const authorizedUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationBody,
    });

  typia.assert(authorizedUser);

  // Step 2: Verify registration response contains required user information
  TestValidator.equals(
    "registered email should match input email",
    authorizedUser.email,
    registrationBody.email,
  );

  TestValidator.predicate(
    "user should have a valid ID after registration",
    authorizedUser.id.length > 0,
  );

  TestValidator.predicate(
    "access token should be present",
    authorizedUser.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be present",
    authorizedUser.token.refresh.length > 0,
  );

  // Step 3: Verify that connection headers have been automatically updated with the access token
  TestValidator.predicate(
    "connection headers should contain Authorization header after registration",
    connection.headers !== undefined &&
      connection.headers.Authorization !== undefined,
  );

  TestValidator.equals(
    "Authorization header should contain the access token",
    connection.headers?.Authorization,
    authorizedUser.token.access,
  );

  // Step 4: Verify user account is properly created and ready for authenticated operations
  TestValidator.predicate(
    "newly registered user should have all required authentication credentials",
    authorizedUser.id !== null &&
      authorizedUser.email !== null &&
      authorizedUser.token.access !== null &&
      authorizedUser.created_at !== null &&
      authorizedUser.updated_at !== null,
  );

  TestValidator.predicate(
    "deleted_at should be null or undefined for active newly created user",
    authorizedUser.deleted_at === null ||
      authorizedUser.deleted_at === undefined,
  );
}
