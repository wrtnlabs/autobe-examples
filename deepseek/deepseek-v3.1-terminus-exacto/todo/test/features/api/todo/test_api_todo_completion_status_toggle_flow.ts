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

export async function test_api_todo_completion_status_toggle_flow(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate member via utility function
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create todo via utility function
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Test Todo",
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Verify initial state is incomplete
  TestValidator.equals(
    "initial todo should be incomplete",
    todo.is_completed,
    false,
  );
  TestValidator.notEquals("todo should have owner", todo.member.id, undefined);
  TestValidator.equals(
    "todo owner should be the authenticated member",
    todo.member.id,
    memberAuth.id,
  );
  // 4. Toggle to complete
  const completedTodo =
    await api.functional.multiUserTodo.member.todos.completion_statuses.toggleCompletionStatus(
      memberConnection,
      {
        todoId: todo.id,
        body: {} satisfies IMultiUserTodoTodo.ICompletionStatus,
      },
    );
  typia.assert(completedTodo);
  // 5. Validate completion status changed to true
  TestValidator.equals(
    "todo should be marked as complete",
    completedTodo.is_completed,
    true,
  );
  // 5. Verify all other fields remain unchanged (except updated_at)
  TestValidator.equals("id should remain the same", completedTodo.id, todo.id);
  TestValidator.equals(
    "title should remain unchanged",
    completedTodo.title,
    todo.title,
  );
  TestValidator.equals(
    "description should remain unchanged",
    completedTodo.description,
    todo.description,
  );
  TestValidator.equals(
    "start_date should remain unchanged",
    completedTodo.start_date,
    todo.start_date,
  );
  TestValidator.equals(
    "due_date should remain unchanged",
    completedTodo.due_date,
    todo.due_date,
  );
  TestValidator.equals(
    "member id should remain unchanged",
    completedTodo.member.id,
    todo.member.id,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    completedTodo.created_at,
    todo.created_at,
  );
  // 6. Validate updated_at timestamp is more recent than original
  TestValidator.predicate(
    "updated_at should be more recent after completion",
    new Date(completedTodo.updated_at) > new Date(todo.updated_at),
  );
  // 7. Toggle back to incomplete
  const incompleteTodo =
    await api.functional.multiUserTodo.member.todos.completion_statuses.toggleCompletionStatus(
      memberConnection,
      {
        todoId: todo.id,
        body: {} satisfies IMultiUserTodoTodo.ICompletionStatus,
      },
    );
  typia.assert(incompleteTodo);
  // 8. Validate completion status changed back to false
  TestValidator.equals(
    "todo should be marked as incomplete",
    incompleteTodo.is_completed,
    false,
  );
  // 8. Verify fields remain consistent
  TestValidator.equals("id should remain the same", incompleteTodo.id, todo.id);
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
  TestValidator.equals(
    "start_date should remain unchanged",
    incompleteTodo.start_date,
    todo.start_date,
  );
  TestValidator.equals(
    "due_date should remain unchanged",
    incompleteTodo.due_date,
    todo.due_date,
  );
  TestValidator.equals(
    "member id should remain unchanged",
    incompleteTodo.member.id,
    todo.member.id,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    incompleteTodo.created_at,
    todo.created_at,
  );
  // Validate updated_at is more recent than previous update
  TestValidator.predicate(
    "updated_at should be more recent after second toggle",
    new Date(incompleteTodo.updated_at) > new Date(completedTodo.updated_at),
  );
  // 9. Final validation that todo remains owned by the authenticated member
  TestValidator.equals(
    "final todo owner should be the authenticated member",
    incompleteTodo.member.id,
    memberAuth.id,
  );
}
