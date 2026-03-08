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

export async function test_api_todo_soft_delete_primary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member account setup using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const memberAuth: ITodoAppMember.IAuthorized = await authorize_member_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        displayName: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000/register",
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // 2. Create member-specific connection with token from authentication
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Create a todo with all optional fields
  const todoInput = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    start_date: typia.random<string & tags.Format<"date-time">>(),
    due_date: typia.random<string & tags.Format<"date-time">>(),
  } satisfies ITodoAppTodo.ICreate;
  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(memberConnection, {
      body: todoInput,
    });
  typia.assert(createdTodo);
  // 4. Verify initial todo state
  TestValidator.equals(
    "todo is not deleted initially",
    createdTodo.is_deleted,
    false,
  );
  TestValidator.equals(
    "todo title matches input",
    createdTodo.title,
    todoInput.title,
  );
  TestValidator.equals(
    "todo description matches input",
    createdTodo.description,
    todoInput.description,
  );
  TestValidator.equals(
    "todo start_date matches input",
    createdTodo.start_date,
    todoInput.start_date,
  );
  TestValidator.equals(
    "todo due_date matches input",
    createdTodo.due_date,
    todoInput.due_date,
  );
  TestValidator.equals(
    "todo is incomplete by default",
    createdTodo.is_complete,
    false,
  );
  TestValidator.equals(
    "todo belongs to correct author",
    createdTodo.author.id,
    memberAuth.id,
  );
  // 5. Soft delete the todo using the erase endpoint
  // The endpoint returns void on success, throwing error on failure
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: createdTodo.id,
  });
  // If we reach here, the soft delete succeeded without error
  TestValidator.predicate("soft delete operation completed successfully", true);
}
