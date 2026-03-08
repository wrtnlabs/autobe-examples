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

export async function test_api_todo_retrieval_own_item_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberSession = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(memberSession);
  // Step 2: Create a todo item
  const createdTodo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  // Step 3: Retrieve the specific todo item
  const retrievedTodo = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(retrievedTodo);
  // Step 4: Validate that retrieved todo matches created todo
  TestValidator.equals("ID matches", retrievedTodo.id, createdTodo.id);
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
  TestValidator.equals(
    "is_complete matches",
    retrievedTodo.is_complete,
    createdTodo.is_complete,
  );
  TestValidator.equals(
    "is_trashed matches",
    retrievedTodo.is_trashed,
    createdTodo.is_trashed,
  );
}
