import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user registration with a unique email and password in the todo-list
 * system.
 *
 * 1. Generate a random unique email and secure password for the user.
 * 2. Call the registration endpoint (api.functional.auth.user.join) using these
 *    credentials.
 * 3. Verify the response:
 *
 *    - Returns ITodoListUser.IAuthorized structure (typia.assert ensures all
 *         type/format validations).
 *    - The email returned matches the one provided and is unique.
 *    - The account is not locked by default (is_locked === false).
 *    - The user.summary is present and consistent with the root fields.
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // Generate unique email and password
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const accountInput = { email, password } satisfies ITodoListUser.ICreate;

  // Register user
  const auth = await api.functional.auth.user.join(connection, {
    body: accountInput,
  });
  typia.assert(auth); // validates ITodoListUser.IAuthorized structure

  // Check business logic
  TestValidator.equals("email matches input", auth.email, email);
  TestValidator.equals("account is not locked", auth.is_locked, false);
  TestValidator.predicate(
    "user summary present",
    auth.user !== undefined && auth.user !== null,
  );
  const userSummary = auth.user!;
  TestValidator.equals("summary.id matches root id", userSummary.id, auth.id);
  TestValidator.equals("summary.email matches input", userSummary.email, email);
  TestValidator.equals(
    "summary.is_locked matches root",
    userSummary.is_locked,
    auth.is_locked,
  );
}
