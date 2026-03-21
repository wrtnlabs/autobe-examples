import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_permanent_deletion_from_trash(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new todo with valid title and description
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Soft-delete the todo (move to trash)
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. Permanently delete the todo from trash
  await api.functional.multiUserTodo.member.todos.trash.erase(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  // 5. Verify the todo no longer exists by attempting soft-delete again (should return 404)
  await TestValidator.httpError(
    "todo no longer exists after permanent deletion",
    404,
    () =>
      api.functional.multiUserTodo.member.todos.erase(memberConnection, {
        todoId: todo.id,
      }),
  );
  // 6. Verify attempting to permanently delete again also returns 404
  await TestValidator.httpError(
    "cannot permanently delete non-existent todo",
    404,
    () =>
      api.functional.multiUserTodo.member.todos.trash.erase(memberConnection, {
        todoId: todo.id,
      }),
  );
}
