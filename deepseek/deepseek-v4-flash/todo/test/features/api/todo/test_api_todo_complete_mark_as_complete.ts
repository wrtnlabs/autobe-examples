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
 * Test marking an active todo as complete via the completion toggle endpoint.
 *
 * Validates the full lifecycle: member registration, todo creation, and completion status toggle. Ensures that the response is a valid ITodoAppTodo entity with a non-null completed_at timestamp and that the updated_at field is refreshed upon modification.
 *
 * 1. Register a new member account with randomized credentials.
 * 2. Create a new todo item in the member's workspace.
 * 3. Call PUT /todoApp/member/todos/{todoId}/complete to toggle the todo as complete.
 * 4. Verify the response is a valid ITodoAppTodo.
 * 5. Verify completed_at is a non-null timestamp, indicating the todo is now complete.
 * 6. Verify updated_at has been refreshed from its previous value.
 */
export async function test_api_todo_complete_mark_as_complete(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for the member
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Create a new member account
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a new todo item
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // Record the timestamps before toggling
  const updatedAtBefore = todo.updated_at;
  // 3. Toggle the todo as complete
  const completedTodo = await api.functional.todoApp.member.todos.complete(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(completedTodo);
  // 4. Verify completed_at is a non-null timestamp (todo is now complete)
  TestValidator.predicate(
    "completed_at is non-null after marking complete",
    () => completedTodo.completed_at !== null,
  );
  // 5. Verify updated_at has been refreshed
  TestValidator.notEquals(
    "updated_at refreshed after completion toggle",
    completedTodo.updated_at,
    updatedAtBefore,
  );
}
