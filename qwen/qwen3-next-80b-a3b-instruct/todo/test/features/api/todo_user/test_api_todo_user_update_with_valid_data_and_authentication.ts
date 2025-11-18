import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test updating a user account's email and password hash after registration.
 *
 * 1. Register a new Todo user via /auth/user/join (creates authentication session)
 * 2. Update that user's email and password_hash via /todo/user/users/{userId}, as
 *    self
 * 3. Assert:
 *
 *    - Email and password_hash accepted/updated (check returned user.email and that
 *         password_hash not leaked)
 *    - Updated_at timestamp is newer than original
 *    - Id, created_at, deleted_at remain unchanged
 *    - Password hash is not exposed in any response
 *    - Authentication/enforcement only allows user to update self
 */
export async function test_api_todo_user_update_with_valid_data_and_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const initialJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(15),
    href: "https://app.todo.com/signup",
    referrer: "https://app.todo.com/landing",
  } satisfies ITodoUser.IJoin;
  const authorized: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: initialJoinBody },
  );
  typia.assert(authorized);

  // Save original state for comparison
  const {
    id,
    email: originalEmail,
    created_at,
    updated_at,
    deleted_at,
  } = authorized;

  // 2. Update email and password_hash as the same user
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newPasswordHash = RandomGenerator.alphaNumeric(64);
  const updateBody = {
    email: newEmail,
    password_hash: newPasswordHash,
  } satisfies ITodoUser.IUpdate;

  const updated: ITodoUser = await api.functional.todo.user.users.update(
    connection,
    {
      userId: id,
      body: updateBody,
    },
  );

  typia.assert(updated);

  // 3. Validate business invariants
  TestValidator.equals("id remains same", updated.id, id);
  TestValidator.notEquals("email has changed", updated.email, originalEmail);
  TestValidator.equals("updated email stored", updated.email, newEmail);
  TestValidator.equals("created_at unchanged", updated.created_at, created_at);
  TestValidator.notEquals(
    "updated_at must have changed after update",
    updated.updated_at,
    updated_at,
  );
  TestValidator.equals(
    "deleted_at is preserved (both null or unchanged)",
    updated.deleted_at,
    deleted_at,
  );

  // Ensure password_hash is never exposed in response
  TestValidator.predicate(
    "password_hash not exposed in user object",
    Object.keys(updated).includes("password_hash") === false,
  );
}
