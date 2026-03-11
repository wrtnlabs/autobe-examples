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
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_completion_toggle_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // Create a todo
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
  // Verify initial completion status is false (incomplete)
  TestValidator.equals(
    "initial todo completion status",
    todo.is_completed,
    false,
  );
  // First toggle: mark as complete
  const completedTodo =
    await api.functional.multiUserTodo.member.completion.status(
      memberConnection,
      {
        body: {
          page: null,
          limit: null,
        } satisfies IMultiUserTodoTodoCompletionStatus.IRequest,
      },
    );
  typia.assert(completedTodo);
  // Verify completion status changed to true
  TestValidator.equals(
    "todo marked complete",
    completedTodo.is_completed,
    true,
  );
  TestValidator.equals("todo ID remains same", completedTodo.id, todo.id);
  TestValidator.equals(
    "todo ownership maintained",
    completedTodo.member.id,
    member.id,
  );
  // Second toggle: mark as incomplete
  const incompleteTodo =
    await api.functional.multiUserTodo.member.completion.status(
      memberConnection,
      {
        body: {
          page: null,
          limit: null,
        } satisfies IMultiUserTodoTodoCompletionStatus.IRequest,
      },
    );
  typia.assert(incompleteTodo);
  // Verify completion status changed back to false
  TestValidator.equals(
    "todo marked incomplete",
    incompleteTodo.is_completed,
    false,
  );
  TestValidator.equals("todo ID remains same", incompleteTodo.id, todo.id);
  TestValidator.equals(
    "todo ownership maintained",
    incompleteTodo.member.id,
    member.id,
  );
  // Validate bidirectional toggle mechanism
  TestValidator.notEquals(
    "completion status changed between toggles",
    completedTodo.is_completed,
    incompleteTodo.is_completed,
  );
  // Validate edit history by checking updated_at timestamps
  TestValidator.predicate(
    "first toggle updates timestamp",
    completedTodo.updated_at > todo.updated_at,
  );
  TestValidator.predicate(
    "second toggle updates timestamp",
    incompleteTodo.updated_at > completedTodo.updated_at,
  );
}
