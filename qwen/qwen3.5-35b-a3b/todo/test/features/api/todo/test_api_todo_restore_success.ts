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

export async function test_api_todo_restore_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get auth token
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a todo using the same connection (headers already set by authorize_member_join)
  const createdTodo = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Test Todo for Restore",
        description: "This is a test todo to verify restore functionality",
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  // 3. Soft delete the todo
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: createdTodo.id,
  });
  // 4. Restore the todo from trash
  const restoredTodo = await api.functional.multiUserTodo.member.trash.restore(
    memberConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(restoredTodo);
  // 5. Validate restoration
  TestValidator.equals("is_deleted is false", restoredTodo.is_deleted, false);
  TestValidator.equals("deleted_at is null", restoredTodo.deleted_at, null);
  TestValidator.equals(
    "title preserved",
    restoredTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "description preserved",
    restoredTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "is_complete preserved",
    restoredTodo.is_complete,
    createdTodo.is_complete,
  );
  TestValidator.equals(
    "start_date preserved",
    restoredTodo.start_date,
    createdTodo.start_date,
  );
  TestValidator.equals(
    "due_date preserved",
    restoredTodo.due_date,
    createdTodo.due_date,
  );
  TestValidator.predicate(
    "updated_at reflects restoration",
    new Date(restoredTodo.updated_at) > new Date(createdTodo.updated_at),
  );
}
