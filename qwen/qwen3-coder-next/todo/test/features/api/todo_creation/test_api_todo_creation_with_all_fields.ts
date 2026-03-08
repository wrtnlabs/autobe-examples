import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
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

export async function test_api_todo_creation_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppMemberSession.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create todo with all fields
  const body = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    start_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
  } satisfies ITodoAppTodo.ICreate;
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body,
    },
  );
  typia.assert(todo);
  // 3. Validate all fields
  TestValidator.equals("title matches", todo.title, body.title);
  TestValidator.equals(
    "description matches",
    todo.description,
    body.description,
  );
  TestValidator.equals("start_date matches", todo.start_date, body.start_date);
  TestValidator.equals("due_date matches", todo.due_date, body.due_date);
  TestValidator.equals("is_complete is false", todo.is_complete, false);
}
