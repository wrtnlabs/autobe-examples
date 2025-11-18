import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Tests successful registration of a new user through /auth/user/join.
 *
 * This test verifies the following:
 *
 * 1. A user can register with a unique, valid email and password that meets system
 *    policy requirements.
 * 2. Session context information (href, referrer) is properly supplied and
 *    accepted.
 * 3. The ip context is omitted to test undefined/null handling (the backend must
 *    handle its absence gracefully).
 * 4. On success, the API returns a valid IAuthorized user object containing the
 *    user's id, email, created_at, updated_at, and correct IAuthorizationToken
 *    structure (access/refresh tokens, and correct date-time fields).
 * 5. Authentication is established as a side-effect by the SDK (implicit in API
 *    contract).
 *
 * Steps:
 *
 * - Generate a valid, unique email for registration and a password satisfying
 *   min/max length.
 * - Generate random href and referrer URIs for context.
 * - Call api.functional.auth.user.join with the above data, omitting the ip
 *   field.
 * - Assert the response with typia.assert for IAuthorized structure.
 * - Assert the returned email matches input, and token fields are valid looking
 *   access/refresh tokens.
 * - Check that created_at/updated_at are present and well-formed ISO 8601
 *   strings.
 *
 * This test runs in a fully unauthenticated context, as registration must be
 * open for new users.
 */
export async function test_api_user_registration_successful(
  connection: api.IConnection,
) {
  // Step 1: Prepare unique, valid user registration data
  const email = typia.random<
    string & tags.Format<"email"> & tags.MinLength<3> & tags.MaxLength<256>
  >();
  const password = RandomGenerator.alphaNumeric(12); // Satisfies min (8) and max (128) length policy
  const href =
    "https://" + RandomGenerator.alphaNumeric(16) + ".com/registration";
  const referrer = "https://" + RandomGenerator.alphaNumeric(16) + ".com/start";

  const registration = {
    email,
    password,
    href,
    referrer,
    // ip is omitted to test the system's flexibility (should be allowed as undefined)
  } satisfies ITodoUser.ICreate;

  // Step 2: Execute registration API call
  const output = await api.functional.auth.user.join(connection, {
    body: registration,
  });

  // Step 3: Validate API response structure and content
  typia.assert<ITodoUser.IAuthorized>(output);
  TestValidator.equals("Returned email matches input", output.email, email);
  TestValidator.predicate(
    "Access token present and non-empty string",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "Refresh token present and non-empty string",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(output.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(output.updated_at),
  );
  TestValidator.predicate(
    "Token expired_at is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
      output.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "Token refreshable_until is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
      output.token.refreshable_until,
    ),
  );
}
