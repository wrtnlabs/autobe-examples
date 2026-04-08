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

export async function test_api_todo_update_multiple_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2. Create todo with initial values
  const todoConnection: api.IConnection = { host: connection.host };
  todoConnection.headers = {
    ...todoConnection.headers,
    Authorization: member.token.access,
  };
  const createdTodo = await generate_random_multi_user_todo_member_todos_create(
    todoConnection,
    {
      body: {
        title: "Initial Title",
        description: "Initial description",
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  // Store original updated_at for comparison
  const originalUpdatedAt = createdTodo.updated_at;
  // 3. Generate update values
  const newTitle = "Updated Title";
  const newDescription = "Updated description with more details";
  const newStartDate = new Date(Date.now() + 86400000).toISOString();
  const newDueDate = new Date(Date.now() + 2592000000).toISOString();
  // 4. Update todo with multiple fields
  const updatedTodo = await api.functional.multiUserTodo.member.todos.update(
    todoConnection,
    {
      todoId: createdTodo.id,
      body: {
        title: newTitle,
        description: newDescription,
        start_date: newStartDate,
        due_date: newDueDate,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 5. Validate updated fields
  TestValidator.equals("title updated", updatedTodo.title, newTitle);
  TestValidator.equals(
    "description updated",
    updatedTodo.description,
    newDescription,
  );
  TestValidator.equals(
    "start_date updated",
    updatedTodo.start_date,
    newStartDate,
  );
  TestValidator.equals("due_date updated", updatedTodo.due_date, newDueDate);
  // 6. Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at changed",
    originalUpdatedAt,
    updatedTodo.updated_at,
  );
  // 7. Verify other fields remain unchanged
  TestValidator.equals("is_complete unchanged", updatedTodo.is_complete, false);
  TestValidator.equals("is_deleted unchanged", updatedTodo.is_deleted, false);
  TestValidator.equals(
    "member_id unchanged",
    updatedTodo.multi_user_todo_member_id,
    member.id,
  );
  // 8. Verify created_at remains unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedTodo.created_at,
    createdTodo.created_at,
  );
}
