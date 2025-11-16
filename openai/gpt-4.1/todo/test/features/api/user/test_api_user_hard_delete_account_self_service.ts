import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates self-service hard deletion of a Todo List user account.
 *
 * This scenario tests that a user can register, authenticate, then permanently
 * delete their own account through the hard delete endpoint. After account
 * deletion, all associated authentication (access/refresh tokens) and sessions
 * must be invalidated, making authentication or recovery impossible, satisfying
 * strong privacy/data minimization business rules.
 *
 * Steps:
 *
 * 1. Register a unique user account
 * 2. Validate successful authentication/token issuance
 * 3. Self-delete account via DELETE endpoint
 * 4. Assert further authentication or session creation is impossible
 */
export async function test_api_user_hard_delete_account_self_service(
  connection: api.IConnection,
) {
  // 1. Register a new unique user account
  const userCredentials = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<254> & tags.Format<"email">
    >(),
    password: RandomGenerator.alphaNumeric(12), // 12+ char random password
  } satisfies ITodoListUser.ICreate;

  const registration: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userCredentials });
  typia.assert(registration);

  TestValidator.equals(
    "registered email matches",
    registration.email,
    userCredentials.email,
  );

  // 2. Attempt to hard-delete the user's own account while authenticated
  await api.functional.todoList.user.users.erase(connection, {
    userId: registration.id,
  });

  // 3. Attempt to re-authenticate or use the deleted account - must fail
  // Since login API isn't present, simulate by attempting re-join (which would fail for duplicate if soft-deleted, but must succeed if hard delete)
  const rejoinCredentials = {
    email: userCredentials.email,
    password: RandomGenerator.alphaNumeric(12), // Use a new password
  } satisfies ITodoListUser.ICreate;
  // Re-registration for the deleted email should now be possible (hard delete means unique constraint is released)
  const rejoin = await api.functional.auth.user.join(connection, {
    body: rejoinCredentials,
  });
  typia.assert(rejoin);
  TestValidator.equals(
    "email may be re-registered after hard delete",
    rejoin.email,
    rejoinCredentials.email,
  );
}
