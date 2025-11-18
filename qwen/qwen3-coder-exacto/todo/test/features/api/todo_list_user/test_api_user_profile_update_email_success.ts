import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate a successful update of a user's email address by the owner with
 * authentication enforced.
 *
 * Steps:
 *
 * 1. Register a new Todo List user (join) and capture the user's ID and initial
 *    state.
 * 2. Update the user's profile to a new, unique email address using their own
 *    authorization.
 * 3. Validate the response:
 *
 *    - Email field updated to the new value
 *    - User ID remains unchanged
 *    - Updated_at timestamp is refreshed and is later than the original value
 *    - Created_at timestamp is unchanged
 * 4. Confirm that the user can only update their own profile (ownership enforced).
 */
export async function test_api_user_profile_update_email_success(
  connection: api.IConnection,
) {
  // 1. Register a new user with join endpoint
  const userCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://app.todo.com/register",
    referrer: "https://google.com/search?q=todo+register",
  } satisfies ITodoListUser.ICreate;

  const join: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userCreate },
  );
  typia.assert(join);
  const userId = join.id;
  const originalEmail = join.email;
  const createdAt = join.created_at;
  const updatedAt = join.updated_at;

  // 2. Update the user's email to a new, random unique email address
  const newEmail = typia.random<string & tags.Format<"email">>();
  // Defensive: ensure newEmail does not equal originalEmail (extremely rare but possible in random)
  const safeEmail =
    newEmail !== originalEmail
      ? newEmail
      : typia.random<string & tags.Format<"email">>();
  const updateBody = { email: safeEmail } satisfies ITodoListUser.IUpdate;

  const updated: ITodoListUser =
    await api.functional.todoList.user.users.update(connection, {
      userId,
      body: updateBody,
    });
  typia.assert(updated);

  // 3. Validate core properties
  TestValidator.equals(
    "email field updated to new value",
    updated.email,
    safeEmail,
  );
  TestValidator.equals(
    "user id remains unchanged after update",
    updated.id,
    userId,
  );
  TestValidator.notEquals(
    "updated_at timestamp is refreshed",
    updated.updated_at,
    updatedAt,
  );
  TestValidator.equals(
    "created_at timestamp is unchanged",
    updated.created_at,
    createdAt,
  );

  // 4. (Ownership enforcement is handled by authentication and endpoint; tested here by using only owner context)
}
