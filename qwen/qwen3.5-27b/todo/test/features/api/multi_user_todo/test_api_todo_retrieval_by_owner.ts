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

/**
 * Test that an authenticated member can successfully retrieve their own todo by UUID.
 * Validates the primary success path where a user retrieves their own todo details.
 */
export async function test_api_todo_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(authorized);
  // 2. Create a new todo item
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: undefined,
    },
  );
  typia.assert(todo);
  // 3. Retrieve the todo by ID
  const retrieved = await api.functional.multiUserTodo.member.todos.at(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate response contains all expected fields
  TestValidator.equals("todo id matches", retrieved.id, todo.id);
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
    "todo completed matches",
    retrieved.completed,
    todo.completed,
  );
  TestValidator.equals("todo deleted matches", retrieved.deleted, todo.deleted);
  TestValidator.equals(
    "todo created_at matches",
    retrieved.created_at,
    todo.created_at,
  );
  TestValidator.equals(
    "todo updated_at matches",
    retrieved.updated_at,
    todo.updated_at,
  );
  TestValidator.equals(
    "todo deleted_at matches",
    retrieved.deleted_at,
    todo.deleted_at,
  );
  // 5. Verify todo ownership - member field should match authenticated user
  TestValidator.equals("member id matches", retrieved.member.id, authorized.id);
  TestValidator.equals(
    "member email matches",
    retrieved.member.email,
    authorized.email,
  );
  TestValidator.equals(
    "member display_name matches",
    retrieved.member.display_name,
    authorized.display_name,
  );
}
