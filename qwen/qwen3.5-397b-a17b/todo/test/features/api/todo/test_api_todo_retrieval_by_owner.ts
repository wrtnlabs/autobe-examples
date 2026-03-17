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

export async function test_api_todo_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
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
  // 2. Create a todo with all optional fields
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        started_at: new Date().toISOString(),
        due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Retrieve the todo by ID
  const retrievedTodo = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(retrievedTodo);
  // 4. Validate all fields match
  TestValidator.equals("todo id", retrievedTodo.id, todo.id);
  TestValidator.equals("todo title", retrievedTodo.title, todo.title);
  TestValidator.equals(
    "todo description",
    retrievedTodo.description,
    todo.description,
  );
  TestValidator.equals(
    "todo started_at",
    retrievedTodo.started_at,
    todo.started_at,
  );
  TestValidator.equals("todo due_at", retrievedTodo.due_at, todo.due_at);
  TestValidator.equals("todo completed", retrievedTodo.completed, false);
  TestValidator.equals("member id", retrievedTodo.member.id, member.id);
  TestValidator.equals(
    "member display_name",
    retrievedTodo.member.display_name,
    member.display_name,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedTodo.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedTodo.updated_at !== null,
  );
}
