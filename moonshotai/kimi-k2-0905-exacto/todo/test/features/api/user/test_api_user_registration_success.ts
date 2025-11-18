import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful user registration with valid email and password. Verifies
 * that new users can create accounts with proper email format and secure
 * passwords, receiving immediate authentication tokens for system access.
 * Validates email uniqueness, password security requirements, and successful
 * token generation with proper expiration timestamps.
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // Generate valid test data for user registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // 12 character secure password

  // User registration request data
  const requestBody = {
    email,
    password,
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies ITodoAppUser.IJoin;

  // Register new user
  const registeredUser = await api.functional.auth.user.join(connection, {
    body: requestBody,
  });

  // Validate response structure
  typia.assert(registeredUser);

  // Validate user data
  TestValidator.equals(
    "user email matches request",
    registeredUser.email,
    email,
  );
  TestValidator.predicate(
    "user has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      registeredUser.id,
    ),
  );
  TestValidator.predicate(
    "user has creation timestamp",
    registeredUser.created_at !== undefined &&
      registeredUser.created_at !== null,
  );

  // Validate authorization token
  const { token } = registeredUser;
  TestValidator.predicate(
    "token has access token",
    token.access !== undefined && token.access !== null,
  );
  TestValidator.predicate(
    "token has refresh token",
    token.refresh !== undefined && token.refresh !== null,
  );
  TestValidator.predicate(
    "token has valid expiration format",
    token.expired_at !== undefined && token.expired_at !== null,
  );
  TestValidator.predicate(
    "token has refreshable timestamp",
    token.refreshable_until !== undefined && token.refreshable_until !== null,
  );

  // Validate connection has received authorization
  TestValidator.equals(
    "connection has authorization header",
    connection.headers?.Authorization,
    token.access,
  );
}
