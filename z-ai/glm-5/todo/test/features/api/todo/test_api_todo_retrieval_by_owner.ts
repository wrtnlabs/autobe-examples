import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_private_todo_app_member_todos_create } from "../../../generate/generate_random_private_todo_app_member_todos_create";
import { prepare_random_private_todo_app_todo } from "../../../prepare/prepare_random_private_todo_app_todo";

export async function test_api_todo_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a todo item that will be retrieved
  const createInput = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    start_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IPrivateTodoAppTodo.ICreate;
  const createdTodo =
    await generate_random_private_todo_app_member_todos_create(
      memberConnection,
      { body: createInput },
    );
  typia.assert(createdTodo);
  // 3. Retrieve the todo by ID
  const retrievedTodo = await api.functional.privateTodoApp.member.todos.at(
    memberConnection,
    { todoId: createdTodo.id },
  );
  typia.assert(retrievedTodo);
  // 4. Validate the retrieved todo matches the created one
  TestValidator.equals("todo id matches", retrievedTodo.id, createdTodo.id);
  TestValidator.equals("title matches", retrievedTodo.title, createdTodo.title);
  TestValidator.equals(
    "description matches",
    retrievedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "start_date matches",
    retrievedTodo.start_date,
    createdTodo.start_date,
  );
  TestValidator.equals(
    "due_date matches",
    retrievedTodo.due_date,
    createdTodo.due_date,
  );
  TestValidator.equals("completed is false", retrievedTodo.completed, false);
  TestValidator.equals("deleted_at is null", retrievedTodo.deleted_at, null);
  TestValidator.equals("member id matches", retrievedTodo.member.id, member.id);
}
