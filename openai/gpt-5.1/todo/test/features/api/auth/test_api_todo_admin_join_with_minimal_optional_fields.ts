import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

/**
 * Validate todoAdmin admin registration with minimal optional fields.
 *
 * This test verifies that the public `/auth/todoAdmin/join` endpoint accepts an
 * ITodoAppTodoAdminJoin.IRequest payload where nullable optional fields are
 * explicitly set to null, while required fields are properly populated. It
 * ensures that:
 *
 * 1. A unique, valid email and a reasonable password are sufficient to create a
 *    new admin account.
 * 2. `displayName` can be explicitly set to null without causing validation
 *    errors, resulting in a response `display_name` that is null or absent.
 * 3. `ip` can be explicitly set to null, allowing the backend to infer IP from
 *    transport if needed.
 * 4. Required context fields `href` and `referrer` accept valid absolute URIs and
 *    are sufficient for session creation.
 * 5. The endpoint returns an ITodoAppTodoAdmin.IAuthorized object with a valid
 *    IAuthorizationToken bundle.
 *
 * Business flow:
 *
 * - Build a join request with:
 *
 *   - `email`: randomly generated, valid email.
 *   - `password`: fixed strong-ish password string.
 *   - `displayName`: explicitly null.
 *   - `ip`: explicitly null.
 *   - `href` and `referrer`: deterministic, valid URIs.
 * - Call `api.functional.auth.todoAdmin.join` with this body.
 * - Assert the response type using typia.assert.
 * - Verify token presence and basic invariants using TestValidator.
 * - Verify that `display_name` is not populated when we didnt send one (i.e., it
 *   is null or undefined).
 */
export async function test_api_todo_admin_join_with_minimal_optional_fields(
  connection: api.IConnection,
) {
  // Prepare a unique, valid email using typia.random with email format.
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // Use a simple but non-trivial password that should satisfy most basic
  // password policies (length and character diversity).
  const password = "Str0ngP@ssw0rd!";

  // Build the join request body, explicitly providing null for nullable
  // optional fields, and valid URIs for required context fields.
  const body = {
    email,
    password,
    displayName: null,
    ip: null,
    href: "https://admin.todo-app.example.com/register",
    referrer: "https://admin.todo-app.example.com/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  // Call the join endpoint to register a new todoAdmin account.
  const authorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, { body });

  // Perform schema-level validation on the authorized response.
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(authorized);

  // Validate that the token field exists and structurally matches
  // IAuthorizationToken. Although typia.assert above already ensures this,
  // we assert token separately for explicitness and future-proofing.
  typia.assert<IAuthorizationToken>(authorized.token);

  // Business-level assertions using TestValidator.
  // Ensure that the email round-trips correctly.
  TestValidator.equals(
    "todoAdmin join: email in response matches request",
    authorized.email,
    email,
  );

  // Verify that display_name is null or undefined, since we explicitly sent
  // displayName: null and did not set any value.
  const hasDisplayName = authorized.display_name !== undefined;
  if (hasDisplayName) {
    TestValidator.equals(
      "todoAdmin join: display_name is null when displayName was null in request",
      authorized.display_name,
      null,
    );
  } else {
    TestValidator.predicate(
      "todoAdmin join: display_name may be omitted when not provided",
      true,
    );
  }

  // Verify that token strings are non-empty as a minimal sanity check.
  TestValidator.predicate(
    "todoAdmin join: access token is a non-empty string",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "todoAdmin join: refresh token is a non-empty string",
    authorized.token.refresh.length > 0,
  );

  // Ensure that expiration timestamps are valid ISO date-time strings.
  typia.assert<IAuthorizationToken["expired_at"]>(authorized.token.expired_at);
  typia.assert<IAuthorizationToken["refreshable_until"]>(
    authorized.token.refreshable_until,
  );
}
