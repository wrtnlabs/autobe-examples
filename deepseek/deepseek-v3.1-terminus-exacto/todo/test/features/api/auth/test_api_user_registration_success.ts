import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates successful user registration by supplying a unique and valid email
 * address and a compliant password.
 *
 * Ensures the user is created and the returned data includes a unique user ID,
 * email, creation timestamp, and valid JWT tokens. Checks that fields meet
 * schema requirements and returned authentication context matches
 * specifications.
 *
 * Steps:
 *
 * 1. Generate a unique and valid email address and a password that meets
 *    complexity rules.
 * 2. Register a user via api.functional.auth.user.join().
 * 3. Validate that the API response satisfies ITodoListUser.IAuthorized using
 *    typia.assert().
 * 4. Assert that all relevant fields are present: id (uuid), email, locked (should
 *    be false), created_at (date-time), updated_at (date-time), deleted_at
 *    (should be null or undefined), token (with valid access/refresh, date-time
 *    fields).
 * 5. Check email is the same as requested, and the returned id is a valid uuid.
 * 6. Validate that JWT tokens are non-empty strings, with correct expiration
 *    formats.
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // Step 1: Generate valid registration data
  const email = typia.random<
    string & tags.Format<"email"> & tags.MinLength<3> & tags.MaxLength<255>
  >();
  const password = RandomGenerator.alphaNumeric(10) + "Aa1"; // Ensure minimum length & complexity (letters and numbers)
  const requestBody = {
    email,
    password: password satisfies string &
      tags.MinLength<8> &
      tags.MaxLength<72> &
      tags.Format<"password">,
  } satisfies ITodoListUser.ICreate;

  // Step 2: Register the user
  const output = await api.functional.auth.user.join(connection, {
    body: requestBody,
  });

  // Step 3: Validate API response type and structure
  typia.assert<ITodoListUser.IAuthorized>(output);

  // Step 4: Validate returned fields
  // Validate id is correct UUID
  TestValidator.predicate(
    "output.id is valid uuid",
    typeof output.id === "string" && output.id.length > 0,
  );
  // Validate email matches requested email
  TestValidator.equals("output.email matches input email", output.email, email);
  // Validate account is not locked
  TestValidator.equals(
    "output.locked is false for new account",
    output.locked,
    false,
  );
  // Validate created_at/updated_at looks like date-time
  TestValidator.predicate(
    "output.created_at is non-empty date-time string",
    typeof output.created_at === "string" && output.created_at.length > 0,
  );
  TestValidator.predicate(
    "output.updated_at is non-empty date-time string",
    typeof output.updated_at === "string" && output.updated_at.length > 0,
  );
  // Validate deleted_at is null or undefined
  TestValidator.equals(
    "output.deleted_at is null or undefined for active user",
    output.deleted_at ?? null,
    null,
  );

  // Step 5: Validate returned token fields
  const token = output.token;
  typia.assert<IAuthorizationToken>(token);
  TestValidator.predicate(
    "token.access is non-empty",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is non-empty date-time",
    typeof token.expired_at === "string" && token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token.refreshable_until is non-empty date-time",
    typeof token.refreshable_until === "string" &&
      token.refreshable_until.length > 0,
  );
}
