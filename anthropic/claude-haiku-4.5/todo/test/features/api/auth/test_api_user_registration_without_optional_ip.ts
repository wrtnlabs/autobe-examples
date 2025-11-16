import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user registration without providing optional IP parameter.
 *
 * Validates that user registration succeeds when the optional IP field is
 * omitted, allowing the backend to automatically extract the client IP address
 * from request headers. This ensures the system can handle both scenarios:
 * explicit IP provision and automatic IP extraction from headers.
 *
 * The test verifies:
 *
 * 1. User can register without providing IP parameter
 * 2. Backend extracts IP from request headers automatically
 * 3. User account is created with all required fields
 * 4. JWT tokens are generated and returned for authentication
 * 5. Session tracking is properly recorded
 */
export async function test_api_user_registration_without_optional_ip(
  connection: api.IConnection,
) {
  // Generate random user registration data without IP parameter
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // Ensure > 8 characters
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Create registration body without optional IP field
  const registrationBody = {
    email: email,
    password: password,
    href: href,
    referrer: referrer,
  } satisfies ITodoAppUser.ICreate;

  // Register new user without providing IP parameter
  const authorizedUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationBody,
    });

  // Verify the response is valid and properly typed
  typia.assert(authorizedUser);

  // Verify user account was created with correct email
  TestValidator.equals(
    "registered user email matches input",
    authorizedUser.email,
    email,
  );

  // Verify JWT tokens are present and correctly structured
  TestValidator.predicate(
    "access token exists",
    authorizedUser.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token exists",
    authorizedUser.token.refresh.length > 0,
  );

  // Verify token expiration times are valid and in the future
  const now = new Date();
  const expiredAt = new Date(authorizedUser.token.expired_at);
  const refreshableUntil = new Date(authorizedUser.token.refreshable_until);

  TestValidator.predicate(
    "access token expiration is in the future",
    expiredAt > now,
  );

  TestValidator.predicate(
    "refresh token is refreshable in the future",
    refreshableUntil > now,
  );

  // Verify token expiration times have proper ordering
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableUntil >= expiredAt,
  );

  // Verify user timestamps are valid and ordered
  const createdAt = new Date(authorizedUser.created_at);
  const updatedAt = new Date(authorizedUser.updated_at);

  TestValidator.predicate(
    "created_at and updated_at should be equal for new user",
    createdAt.getTime() === updatedAt.getTime(),
  );

  // Verify new user account is not deleted
  TestValidator.equals(
    "new user should not be marked as deleted",
    authorizedUser.deleted_at,
    null,
  );

  // Verify authorization token was automatically set in connection headers
  TestValidator.predicate(
    "authorization header contains access token",
    connection.headers?.Authorization === authorizedUser.token.access,
  );
}
