import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

/**
 * Validate that a non-owner cannot soft-delete another user's list.
 *
 * Business context:
 *
 * - Only the list owner or an authorized administrator may soft-delete a todo
 *   list. This test verifies that an authenticated todoUser who is NOT the
 *   owner cannot soft-delete the list and that the owner can delete it
 *   afterwards (proving the list remained until owner action).
 *
 * Steps:
 *
 * 1. Create an owner account (POST /auth/todoUser/join).
 * 2. Create a non-owner account (POST /auth/todoUser/join).
 * 3. Owner creates a list (POST /todoApp/todoUser/lists) and capture listId.
 * 4. Non-owner attempts DELETE /todoApp/todoUser/lists/{listId} and must fail
 *    (business-level authorization error). Use TestValidator.error to assert an
 *    error is thrown.
 * 5. Owner attempts DELETE /todoApp/todoUser/lists/{listId} and must succeed (204
 *    No Content equivalent behavior in SDK). This validates the list remained
 *    until the legitimate owner removed it.
 */
export async function test_api_list_soft_delete_forbidden_by_non_owner(
  connection: api.IConnection,
) {
  // 1. Prepare two independent connections so we can hold two distinct auth tokens
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const nonOwnerConn: api.IConnection = { ...connection, headers: {} };

  // 2. Owner registration
  const ownerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ownerPassword123",
    displayName: RandomGenerator.name(),
    href: "https://example.com/signup",
    referrer: "https://example.com/",
  } satisfies ITodoAppTodoUser.ICreate;

  const owner: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(ownerConn, { body: ownerBody });
  typia.assert(owner);

  // 3. Non-owner registration
  const nonOwnerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "nonOwnerPass123",
    displayName: RandomGenerator.name(),
    href: "https://example.com/signup",
    referrer: "https://example.com/",
  } satisfies ITodoAppTodoUser.ICreate;

  const nonOwner: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(nonOwnerConn, {
      body: nonOwnerBody,
    });
  typia.assert(nonOwner);

  // 4. Owner creates a todo list
  const createListBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "private",
  } satisfies ITodoAppList.ICreate;

  const list: ITodoAppList = await api.functional.todoApp.todoUser.lists.create(
    ownerConn,
    { body: createListBody },
  );
  typia.assert(list);

  // Ensure we have a list id
  TestValidator.predicate(
    "created list has id",
    typeof list.id === "string" && list.id.length > 0,
  );

  // 5. Non-owner attempts to soft-delete the owner's list -> must throw (403 or 404 per product policy)
  await TestValidator.error(
    "non-owner cannot delete another user's list",
    async () => {
      await api.functional.todoApp.todoUser.lists.erase(nonOwnerConn, {
        listId: list.id,
      });
    },
  );

  // 6. Owner deletes the list successfully (verifies that the list was not removed by non-owner)
  await api.functional.todoApp.todoUser.lists.erase(ownerConn, {
    listId: list.id,
  });

  // If the above did not throw, owner deletion succeeded - assert true
  TestValidator.predicate(
    "owner can delete their own list after failed non-owner attempt",
    true,
  );
}
