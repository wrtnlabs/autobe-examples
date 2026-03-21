import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
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

export async function test_api_todo_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Create a new todo with title and description
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Complete project documentation",
        description: "Write all API docs",
      },
    },
  );
  typia.assert(todo);
  // 3. Retrieve the todo by its ID
  const retrievedTodo = await api.functional.multiUserTodo.member.todos.at(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(retrievedTodo);
  // 4. Validate the retrieved todo matches the created todo
  TestValidator.equals("todo id matches", retrievedTodo.id, todo.id);
  TestValidator.equals(
    "title matches",
    retrievedTodo.title,
    "Complete project documentation",
  );
  TestValidator.equals(
    "description matches",
    retrievedTodo.description,
    "Write all API docs",
  );
  TestValidator.equals("completed is false", retrievedTodo.completed, false);
  TestValidator.equals("deleted_at is null", retrievedTodo.deleted_at, null);
  TestValidator.equals(
    "editHistories is empty",
    retrievedTodo.editHistories.length,
    0,
  );
  TestValidator.equals(
    "editHistories_count is 0",
    retrievedTodo.editHistories_count,
    0,
  );
  TestValidator.equals(
    "member id matches owner",
    retrievedTodo.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member email matches owner",
    retrievedTodo.member.email,
    authorized.email,
  );
}
