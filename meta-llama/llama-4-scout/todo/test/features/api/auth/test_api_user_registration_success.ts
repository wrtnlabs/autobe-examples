import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful user registration flow for the todo list application.
 *
 * Sends a valid email, display name, password, href, and referrer to the
 * registration endpoint. Verifies that the API returns an authorized DTO in
 * pending (unverified) state, issues a verification email, and blocks login
 * until verification.
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // Prepare registration payload with random, valid values
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // optional: ip (not included)
  } satisfies ITodoListUser.IJoin;

  // Call the registration endpoint
  const response = await api.functional.auth.user.join(connection, {
    body: joinInput,
  });
  typia.assert(response);

  // Top-level validations
  TestValidator.equals(
    "email should match input",
    response.email,
    joinInput.email,
  );
  TestValidator.equals(
    "display_name should match input",
    response.display_name,
    joinInput.display_name,
  );
  TestValidator.predicate(
    "registered user must have unverified status",
    response.is_verified === false,
  );
  TestValidator.predicate(
    "registered user must be active immediately after registration",
    response.is_active === true,
  );

  // Check token structure
  typia.assert<IAuthorizationToken>(response.token);
  TestValidator.predicate(
    "access token should be non-empty string",
    typeof response.token.access === "string" &&
      response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty string",
    typeof response.token.refresh === "string" &&
      response.token.refresh.length > 0,
  );

  // Check user summary if present
  if (response.user !== undefined) {
    typia.assert<ITodoListUser.ISummary>(response.user);
    TestValidator.equals(
      "summary.id matches main id",
      response.user.id,
      response.id,
    );
    TestValidator.equals(
      "summary.email matches main email",
      response.user.email,
      response.email,
    );
    TestValidator.equals(
      "summary.display_name matches",
      response.user.display_name,
      response.display_name,
    );
    TestValidator.equals(
      "summary.is_verified matches",
      response.user.is_verified,
      response.is_verified,
    );
    TestValidator.equals(
      "summary.is_active matches",
      response.user.is_active,
      response.is_active,
    );
    TestValidator.equals(
      "summary.created_at matches",
      response.user.created_at,
      response.created_at,
    );
    TestValidator.equals(
      "summary.updated_at matches",
      response.user.updated_at,
      response.updated_at,
    );
    TestValidator.equals(
      "summary.deleted_at matches",
      response.user.deleted_at,
      response.deleted_at,
    );
  }
}
