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

export async function test_api_todo_toggle_completion_incomplete_to_complete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create a todo (defaults to incomplete)
  const todo: ITodoAppTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Validate initial state is incomplete
  TestValidator.predicate(
    "initial todo is incomplete",
    todo.is_completed === false,
  );
  // 4. Store original updated_at for comparison
  const originalUpdatedAt: string = todo.updated_at;
  // 5. Toggle todo to complete
  const updated: ITodoAppTodo =
    await api.functional.todoApp.member.todos.complete.toggle(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          is_completed: true,
        } satisfies ITodoAppTodo.IToggle,
      },
    );
  typia.assert(updated);
  // 6. Validate completion status changed to true
  TestValidator.equals(
    "completion status updated to true",
    updated.is_completed,
    true,
  );
  // 7. Validate updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updated.updated_at,
    originalUpdatedAt,
  );
  // 8. Validate other fields remain unchanged
  TestValidator.equals("id unchanged", updated.id, todo.id);
  TestValidator.equals("title unchanged", updated.title, todo.title);
  TestValidator.equals(
    "description unchanged",
    updated.description,
    todo.description,
  );
  TestValidator.equals("author unchanged", updated.author.id, todo.author.id);
}
