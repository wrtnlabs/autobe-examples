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

export async function test_api_todo_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to get authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create a new todo with the authenticated member
  const todo: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
        description: typia.random<string & tags.MaxLength<500>>(),
        start_date: RandomGenerator.date(
          new Date(),
          30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        due_date: RandomGenerator.date(
          new Date(),
          60 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Retrieve the created todo by ID
  const retrieved: ITodoAppTodo = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate the retrieved todo matches what was created
  TestValidator.equals("todo ID matches", retrieved.id, todo.id);
  TestValidator.equals("todo title matches", retrieved.title, todo.title);
  TestValidator.equals(
    "todo description matches",
    retrieved.description,
    todo.description,
  );
  TestValidator.equals(
    "todo start_date matches",
    retrieved.start_date,
    todo.start_date,
  );
  TestValidator.equals(
    "todo due_date matches",
    retrieved.due_date,
    todo.due_date,
  );
  TestValidator.equals(
    "todo is_complete is false by default",
    retrieved.is_complete,
    false,
  );
  TestValidator.equals("todo is_deleted is false", retrieved.is_deleted, false);
  TestValidator.equals(
    "todo author ID matches",
    retrieved.author.id,
    member.id,
  );
  TestValidator.equals(
    "todo author displayName matches",
    retrieved.author.displayName,
    member.display_name,
  );
  TestValidator.equals("todo deleted_at is null", retrieved.deleted_at, null);
}
