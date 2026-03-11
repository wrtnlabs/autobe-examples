import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
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

export async function test_api_todo_soft_delete_completed_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a todo using generation utility function with optional description
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.pick([
          RandomGenerator.paragraph({ sentences: 3 }),
          null,
        ]),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals("todo initially incomplete", todo.is_completed, false);
  // 3. Mark the todo as completed
  const completedTodo =
    await api.functional.multiUserTodo.member.todos.completion_statuses.toggleCompletionStatus(
      memberConnection,
      {
        todoId: todo.id,
        body: {} satisfies IMultiUserTodoTodo.ICompletionStatus,
      },
    );
  typia.assert(completedTodo);
  TestValidator.equals(
    "todo marked as completed",
    completedTodo.is_completed,
    true,
  );
  // 4. Soft delete the completed todo
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: completedTodo.id,
  });
  // 5. Validate deletion by attempting to toggle completion on deleted todo (should fail)
  await TestValidator.error(
    "cannot toggle completion on deleted todo",
    async () => {
      await api.functional.multiUserTodo.member.todos.completion_statuses.toggleCompletionStatus(
        memberConnection,
        {
          todoId: completedTodo.id,
          body: {} satisfies IMultiUserTodoTodo.ICompletionStatus,
        },
      );
    },
  );
}
