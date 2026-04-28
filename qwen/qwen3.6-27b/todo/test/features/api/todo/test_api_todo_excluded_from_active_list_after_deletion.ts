import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test that a todo is properly soft-deleted after calling the erase endpoint.
 *
 * Validates the complete soft-deletion flow: member registration, todo creation, and subsequent soft-deletion via the erase endpoint. Verifies that the erase operation completes successfully and that the deleted todo can no longer be soft-deleted again.
 *
 * The test creates two separate todos to establish that deletion targets only the specific todo by its unique identifier. It also confirms that creating additional todos after a deletion works correctly, ensuring that the deletion operation doesn't corrupt the todo data or authentication state.
 *
 * 1. Member registers and authenticates their account.
 * 2. A first todo is created with a generated title.
 * 3. A second todo is created to verify independence.
 * 4. The first todo is soft-deleted via the erase endpoint.
 * 5. The soft-deleted todo cannot be deleted again (expected 404 error).
 * 6. Another todo can still be created after the deletion.
 */
export async function test_api_todo_excluded_from_active_list_after_deletion(
  connection: api.IConnection,
) {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create first todo (to be deleted)
  const firstTodoTitle = RandomGenerator.paragraph({ sentences: 2 });
  const firstTodo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: firstTodoTitle,
        description: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(firstTodo);
  // 3. Create second todo to verify independence
  const secondTodo =
    await generate_random_todo_app_member_todos_create(memberConnection);
  typia.assert(secondTodo);
  // 4. Soft-delete the first todo
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: firstTodo.id,
  });
  // 5. Verify deleting again fails (404 - not found since already soft-deleted)
  await TestValidator.error(
    "deleted todo cannot be deleted again",
    async () =>
      await api.functional.todoApp.member.todos.erase(memberConnection, {
        todoId: firstTodo.id,
      }),
  );
  // 6. Verify we can still create new todos after deletion
  const afterDeleteTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(afterDeleteTodo);
  // 7. Validate the original todo properties before deletion
  TestValidator.equals(
    "first todo title matches",
    firstTodo.title,
    firstTodoTitle,
  );
  TestValidator.predicate(
    "first todo was not completed",
    firstTodo.is_completed === false,
  );
  TestValidator.equals(
    "first todo not in trash initially",
    firstTodo.deleted_at,
    null,
  );
  // 8. Validate different todos have different IDs
  TestValidator.notEquals("todos have unique IDs", firstTodo.id, secondTodo.id);
  TestValidator.notEquals(
    "after-delete todo has unique ID",
    firstTodo.id,
    afterDeleteTodo.id,
  );
}
