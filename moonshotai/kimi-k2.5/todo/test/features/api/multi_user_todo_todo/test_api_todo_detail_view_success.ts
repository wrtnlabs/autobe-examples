import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_detail_view_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    },
  });
  // 2. Create a todo with specific values
  const startDate = new Date().toISOString();
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const todoInput = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    startDate,
    dueDate,
  };
  const createdTodo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    { body: todoInput },
  );
  typia.assert(createdTodo);
  // 3. Retrieve todo details
  const retrievedTodo = await api.functional.multiUserTodo.member.todos.at(
    memberConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(retrievedTodo);
  // 4. Validate response matches created todo
  TestValidator.equals("id matches", retrievedTodo.id, createdTodo.id);
  TestValidator.equals("title matches", retrievedTodo.title, todoInput.title);
  TestValidator.equals(
    "description matches",
    retrievedTodo.description,
    todoInput.description,
  );
  TestValidator.equals(
    "startDate matches",
    retrievedTodo.startDate,
    todoInput.startDate,
  );
  TestValidator.equals(
    "dueDate matches",
    retrievedTodo.dueDate,
    todoInput.dueDate,
  );
  TestValidator.equals("isComplete is false", retrievedTodo.isComplete, false);
  TestValidator.equals("completedAt is null", retrievedTodo.completedAt, null);
  TestValidator.equals("deletedAt is null", retrievedTodo.deletedAt, null);
}
