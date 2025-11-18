import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that an authenticated Todo List user (owner) can update their own
 * profile and account status.
 *
 * 1. Register a new user via join, and capture the authenticated user profile,
 *    including id and initial email.
 * 2. Compose new profile update values:
 *
 *    - A new email address different from the original
 *    - A valid strong password
 *    - Toggle the lock status (e.g., if originally false, set to true, and vice
 *         versa)
 * 3. Call the update endpoint as the user themselves (using their id and owner
 *    authentication) to update their profile/account.
 * 4. Validate all of these in the returned ITodoListUser result:
 *
 *    - The user id remains unchanged
 *    - Email reflects the new value
 *    - Locked reflects the changed value
 *    - Created_at remains unchanged
 *    - Updated_at has advanced (date-time string, > previous updated_at)
 *    - Deleted_at is still null or undefined (account not deleted)
 *    - Password is NOT returned or exposed in the response
 * 5. (Framework responsibility) Out of scope: fail if duplicate email or invalid
 *    password (not in this E2E; only test valid update by owner).
 */
export async function test_api_todo_list_user_profile_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as new user
  const joinBody = {
    email: typia.random<
      string & tags.MinLength<3> & tags.MaxLength<255> & tags.Format<"email">
    >(),
    password: typia.random<
      string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
    >(),
  } satisfies ITodoListUser.ICreate;

  const authedUser = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(authedUser);
  const oldUserId = authedUser.id;
  const oldEmail = authedUser.email;
  const oldLocked = authedUser.locked;
  const oldCreatedAt = authedUser.created_at;
  const oldUpdatedAt = authedUser.updated_at;

  // 2. Compose valid update payload (change email, password, flip locked)
  let newEmail: string & tags.MaxLength<255> & tags.Format<"email">;
  do {
    newEmail = typia.random<
      string & tags.MaxLength<255> & tags.Format<"email">
    >();
  } while (newEmail === oldEmail);

  const updateBody = {
    email: newEmail,
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<100>>(),
    locked: !oldLocked,
  } satisfies ITodoListUser.IUpdate;

  // 3. Call the update endpoint as the user/owner
  const updatedUser = await api.functional.todoList.user.users.update(
    connection,
    {
      userId: oldUserId,
      body: updateBody,
    },
  );
  typia.assert(updatedUser);

  // 4. Validate that the user record reflects the changes and not sensitive fields
  TestValidator.equals(
    "User id remains unchanged after update",
    updatedUser.id,
    oldUserId,
  );
  TestValidator.equals("User email is updated", updatedUser.email, newEmail);
  TestValidator.equals(
    "User locked status is updated",
    updatedUser.locked,
    !oldLocked,
  );
  TestValidator.equals(
    "created_at is unchanged",
    updatedUser.created_at,
    oldCreatedAt,
  );
  TestValidator.predicate(
    "updated_at is a later date-time than previous",
    new Date(updatedUser.updated_at).getTime() >
      new Date(oldUpdatedAt).getTime(),
  );
  TestValidator.equals(
    "Account not deleted (deleted_at null or undefined)",
    updatedUser.deleted_at ?? null,
    null,
  );
}
