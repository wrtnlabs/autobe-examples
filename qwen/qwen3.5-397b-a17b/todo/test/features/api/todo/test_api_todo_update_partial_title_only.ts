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

export async function test_api_todo_update_partial_title_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a todo with all fields (title, description, start date, due date)
  const originalTitle = RandomGenerator.paragraph({ sentences: 2 });
  const originalDescription = RandomGenerator.content({ paragraphs: 2 });
  const originalStartDate = new Date();
  const originalDueDate = new Date(
    originalStartDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: originalTitle,
        description: originalDescription,
        started_at: originalStartDate.toISOString(),
        due_at: originalDueDate.toISOString(),
      },
    },
  );
  typia.assert(todo);
  // 3. Update only the title field (partial update)
  const newTitle = RandomGenerator.paragraph({ sentences: 1 });
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: newTitle,
        // description, started_at, due_at are intentionally omitted to test partial update
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Verify title was updated
  TestValidator.equals("title updated", updatedTodo.title, newTitle);
  // 5. Verify other fields remain unchanged
  TestValidator.equals(
    "description preserved",
    updatedTodo.description,
    originalDescription,
  );
  TestValidator.equals(
    "started_at preserved",
    updatedTodo.started_at,
    originalStartDate.toISOString(),
  );
  TestValidator.equals(
    "due_at preserved",
    updatedTodo.due_at,
    originalDueDate.toISOString(),
  );
  // 6. Verify updated_at timestamp was refreshed
  const originalUpdatedAt = new Date(todo.updated_at).getTime();
  const newUpdatedAt = new Date(updatedTodo.updated_at).getTime();
  TestValidator.predicate(
    "updated_at refreshed",
    newUpdatedAt > originalUpdatedAt,
  );
}
