import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPrivateTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPrivateTodoAppTodoEditHistory";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import type { IPrivateTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_private_todo_app_member_todos_create } from "../../../generate/generate_random_private_todo_app_member_todos_create";
import { prepare_random_private_todo_app_todo } from "../../../prepare/prepare_random_private_todo_app_todo";

/**
 * Test privacy enforcement when a member attempts to access edit history
 * for another member's todo.
 *
 * Validates that cross-user access is denied with 404 Not Found (not 403)
 * to maintain privacy - the system must not reveal whether the todo
 * or edit history exists for another user.
 */
export async function test_api_edit_history_cross_user_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Create a todo as Member A
  const todo = await generate_random_private_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todo);
  // 3. Update the todo as Member A to generate edit history
  const updatedTodo = await api.functional.privateTodoApp.member.todos.update(
    memberAConnection,
    {
      todoId: todo.id,
      body: {
        title: "Updated Task Title",
      } satisfies IPrivateTodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. List edit history as Member A to obtain editHistoryId
  const editHistoryList =
    await api.functional.privateTodoApp.member.todos.editHistories.index(
      memberAConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IPrivateTodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(editHistoryList);
  // Verify edit history was created
  TestValidator.predicate(
    "edit history exists after update",
    editHistoryList.data.length > 0,
  );
  const editHistoryId = editHistoryList.data[0].id;
  // 5. Register Member B (different member with no access to Member A's data)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 6. As Member B, attempt to access Member A's edit history
  // Should fail with 404 Not Found (privacy-preserving: doesn't reveal existence)
  await TestValidator.httpError(
    "cross-user access denied with 404",
    404,
    async () => {
      await api.functional.privateTodoApp.member.todos.editHistories.at(
        memberBConnection,
        {
          todoId: todo.id,
          editHistoryId: editHistoryId,
        },
      );
    },
  );
}
