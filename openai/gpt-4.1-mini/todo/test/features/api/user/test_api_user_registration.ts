import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test the user registration process by creating a new user account.
 *
 * This test validates that the system accepts a valid user registration request
 * consisting of a unique email and password in plain text, securely stores the
 * password, issues JWT access and refresh tokens, and returns authorized user
 * information without requiring prior authentication.
 *
 * The test performs the following steps:
 *
 * 1. Generate a unique email address and a secure password.
 * 2. Call the user join API endpoint with the user data.
 * 3. Verify the output matches the ITodoUser.IAuthorized DTO.
 * 4. Assert the returned ID is a valid UUID.
 * 5. Assert the returned access token string is non-empty.
 * 6. Assert the token expiration dates are valid ISO date-time strings.
 *
 * This test ensures the critical user registration flow works as expected,
 * providing a foundation for user authentication in subsequent workflows.
 */
export async function test_api_user_registration(connection: api.IConnection) {
  // Step 1: Generate unique email and password
  const email: string = `${RandomGenerator.name(2).replace(/\s+/g, ".")}@example.com`;
  const password: string = RandomGenerator.alphaNumeric(12);

  // Step 2: Create user join request body
  const createBody = {
    email: email,
    password: password,
  } satisfies ITodoUser.ICreate;

  // Step 3: Call the join API
  const authorizedUser: ITodoUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: createBody,
    });

  // Step 4: Validate the output structure
  typia.assert(authorizedUser);

  // Step 5: Assertions on returned data
  TestValidator.predicate(
    "verified valid UUID format for user ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorizedUser.id,
    ),
  );

  TestValidator.predicate(
    "non-empty access token string",
    typeof authorizedUser.token.access === "string" &&
      authorizedUser.token.access.length > 0,
  );

  TestValidator.predicate(
    "non-empty refresh token string",
    typeof authorizedUser.token.refresh === "string" &&
      authorizedUser.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "valid ISO date-time string for expired_at",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?Z$/.test(
      authorizedUser.token.expired_at,
    ),
  );

  TestValidator.predicate(
    "valid ISO date-time string for refreshable_until",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?Z$/.test(
      authorizedUser.token.refreshable_until,
    ),
  );
}
