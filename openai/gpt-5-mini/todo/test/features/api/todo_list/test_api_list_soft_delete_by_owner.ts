import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_list_soft_delete_by_owner(
  connection: api.IConnection,
) {
  /**
   * Purpose: Verify that an authenticated todoUser can soft-delete their own
   * todo list. Because the SDK materials do not include a GET list operation,
   * we validate deletion by asserting that a subsequent delete of the same list
   * fails (proxy for already-deleted / not found behavior).
   *
   * Steps:
   *
   * 1. Register (join) a new todoUser (owner) via
   *    api.functional.auth.todoUser.join
   *
   *    - This call will set connection.headers.Authorization automatically according
   *         to SDK behaviour.
   * 2. Create a new todo list via api.functional.todoApp.todoUser.lists.create
   *    using the authenticated connection.
   * 3. Soft-delete the created list via
   *    api.functional.todoApp.todoUser.lists.erase
   * 4. Assert that a second attempt to delete the same list results in an error
   *    (await TestValidator.error(...)). Do NOT assert specific HTTP status
   *    codes.
   */

  // 1) Register a new todoUser (owner)
  const owner: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "P@ssw0rd123",
        displayName: null,
        ip: null,
        href: "http://example.com/signup",
        referrer: "http://example.com/",
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(owner);

  // 2) Create a new todo list as the authenticated owner
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    // visibility omitted to exercise default 'private'
  } satisfies ITodoAppList.ICreate;

  const created: ITodoAppList =
    await api.functional.todoApp.todoUser.lists.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // Basic business validations
  TestValidator.equals(
    "created list title matches",
    created.title,
    createBody.title,
  );
  TestValidator.equals("list owner matches", created.owner.id, owner.id);

  // 3) Soft-delete the list
  await api.functional.todoApp.todoUser.lists.erase(connection, {
    listId: created.id,
  });

  // 4) Re-deleting the same list should fail (proxy for already-deleted / not found)
  await TestValidator.error("re-deleting same list should throw", async () => {
    await api.functional.todoApp.todoUser.lists.erase(connection, {
      listId: created.id,
    });
  });
}
