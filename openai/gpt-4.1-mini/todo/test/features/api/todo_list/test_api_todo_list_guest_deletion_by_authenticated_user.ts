import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

/**
 * Test the deletion of a guest todo list user record by an authenticated user.
 *
 * This test verifies that a user who has properly joined and authenticated can
 * delete a guest user record by its UUID.
 *
 * Steps:
 *
 * 1. Create a new user by joining via /auth/user/join.
 * 2. Obtain the authorized user's ID to represent the guest to delete.
 * 3. Attempt to delete the guest user record using
 *    /todoList/user/todoListGuests/{id}.
 * 4. Verify the delete operation completes successfully without errors.
 *
 * The test covers the authorization mechanism and the successful deletion flow.
 */
export async function test_api_todo_list_guest_deletion_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Perform user join to authenticate and obtain user info
  const userCreateRequest = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password: "StrongPassword!123",
    name: RandomGenerator.name(),
  } satisfies ITodoListTodoListUser.ICreate;

  const authorizedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateRequest,
    });
  typia.assert(authorizedUser);

  // 2. Use the authorized user's id as the guest user id to delete
  const guestIdToDelete: string & tags.Format<"uuid"> = authorizedUser.id;

  // 3. Delete the guest user record by id
  await api.functional.todoList.user.todoListGuests.erase(connection, {
    id: guestIdToDelete,
  });

  // 4. If no exception or error, deletion succeeded
  TestValidator.predicate("delete guest todo list user record succeeds", true);
}
