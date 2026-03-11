import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoCompletionStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoCompletionStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_completion_statuses_create } from "../../../generate/generate_random_multi_user_todo_member_todos_completion_statuses_create";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";
import { prepare_random_multi_user_todo_todo_completion_status } from "../../../prepare/prepare_random_multi_user_todo_todo_completion_status";

export async function test_api_todo_completion_status_toggle_incomplete(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate member
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Create a todo
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Verify initial state is incomplete
  TestValidator.equals(
    "initial todo should be incomplete",
    todo.is_completed,
    false,
  );
  // Mark todo as complete
  const completedTodo =
    await generate_random_multi_user_todo_member_todos_completion_statuses_create(
      memberConnection,
      {
        params: { todoId: todo.id },
        body: {
          is_completed: true,
        } satisfies IMultiUserTodoTodoCompletionStatus.ICreate,
      },
    );
  typia.assert(completedTodo);
  // Verify todo is now complete
  TestValidator.equals(
    "todo should be marked complete",
    completedTodo.is_completed,
    true,
  );
  // Mark todo as incomplete
  const incompleteTodo =
    await generate_random_multi_user_todo_member_todos_completion_statuses_create(
      memberConnection,
      {
        params: { todoId: todo.id },
        body: {
          is_completed: false,
        } satisfies IMultiUserTodoTodoCompletionStatus.ICreate,
      },
    );
  typia.assert(incompleteTodo);
  // Verify todo is now incomplete
  TestValidator.equals(
    "todo should be marked incomplete",
    incompleteTodo.is_completed,
    false,
  );
  // Validate data consistency - todo ID should remain the same
  TestValidator.equals(
    "todo ID should remain consistent",
    incompleteTodo.id,
    todo.id,
  );
  TestValidator.equals(
    "title should remain unchanged",
    incompleteTodo.title,
    todo.title,
  );
  TestValidator.equals(
    "description should remain unchanged",
    incompleteTodo.description,
    todo.description,
  );
}
