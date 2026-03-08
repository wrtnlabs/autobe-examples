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

export async function test_api_todo_retrieve_own_active_todo(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // Step 2: Create a todo with custom values
  const title = RandomGenerator.paragraph({ sentences: 3 });
  const description = RandomGenerator.paragraph({ sentences: 5 });
  const now = new Date();
  const startDate = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString();
  const dueDate = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString();
  const createdTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title,
        description,
        startDate,
        dueDate,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  // Step 3: Retrieve the todo
  const retrievedTodo = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(retrievedTodo);
  // Step 4: Validate all fields
  TestValidator.equals("todo id matches", retrievedTodo.id, createdTodo.id);
  TestValidator.equals("title matches", retrievedTodo.title, title);
  TestValidator.equals(
    "description matches",
    retrievedTodo.description,
    description,
  );
  TestValidator.equals("startDate matches", retrievedTodo.startDate, startDate);
  TestValidator.equals("dueDate matches", retrievedTodo.dueDate, dueDate);
  TestValidator.equals("completed is false", retrievedTodo.completed, false);
  TestValidator.equals("deletedAt is null", retrievedTodo.deletedAt, null);
}
