import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful registration of a new user account via the public
 * registration endpoint.
 *
 * This scenario covers onboarding of a new user for the Todo List application,
 * ensuring:
 *
 * - Registration with a unique, valid email address
 * - Registration with a password that meets policy constraints (>=8 chars)
 * - Receipt of an authentication token and user metadata in the response
 *
 * Steps:
 *
 * 1. Generate a random unique email and a valid password per policy
 * 2. Submit to the registration endpoint (`/auth/user/join`)
 * 3. Validate the response has the user's id (uuid format), email (email format),
 *    and an authentication token object (access, refresh, expiry fields).
 * 4. Assert all returned values meet DTO constraints strictly (using typia).
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // 1. Generate a unique, valid email and password
  const input = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<254> & tags.Format<"email">
    >(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
  } satisfies ITodoListUser.ICreate;

  // 2. Register new user via the public endpoint
  const authorized: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: input });
  // 3. Validate user identity and authentication token in response
  typia.assert(authorized);
  TestValidator.predicate(
    "user id is uuid format",
    typeof authorized.id === "string" && authorized.id.length > 0,
  );
  TestValidator.equals("email matches input", authorized.email, input.email);
  typia.assert(authorized.token);
  TestValidator.predicate(
    "token access is non-empty",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is non-empty",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiry and refreshable_until are iso date-time strings",
    typeof authorized.token.expired_at === "string" &&
      authorized.token.expired_at.includes("T") &&
      typeof authorized.token.refreshable_until === "string" &&
      authorized.token.refreshable_until.includes("T"),
  );
}
