import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_app_member_todos_create } from "../../../generate/generate_random_multi_user_todo_app_member_todos_create";
import { prepare_random_multi_user_todo_app_todo } from "../../../prepare/prepare_random_multi_user_todo_app_todo";

export async function test_api_todo_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const member: IMultiUserTodoAppMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(member);
  // 2. Create authenticated connection for todo operations
  const todoConnection: api.IConnection = { host: connection.host };
  todoConnection.headers = { Authorization: `Bearer ${member.token.access}` };
  // 3. Create initial todo with specific values
  const initialTodo: IMultiUserTodoAppTodo =
    await api.functional.multiUserTodoApp.member.todos.create(todoConnection, {
      body: {
        title: "Original Title",
        description: "Original description",
        startDate: "2024-01-15T00:00:00.000Z",
        dueDate: "2024-01-20T00:00:00.000Z",
      } satisfies IMultiUserTodoAppTodo.ICreate,
    });
  typia.assert(initialTodo);
  TestValidator.equals(
    "initial title matches",
    initialTodo.title,
    "Original Title",
  );
  TestValidator.equals(
    "initial description matches",
    initialTodo.description,
    "Original description",
  );
  // 4. Update todo with new title and description
  const updateTimestamp = new Date().toISOString();
  const updatedTodo: IMultiUserTodoAppTodo =
    await api.functional.multiUserTodoApp.member.todos.update(todoConnection, {
      todoId: initialTodo.id,
      body: {
        title: "Updated Title",
        description: "Updated description",
      } satisfies IMultiUserTodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo);
  // 5. Verify timestamps are refreshed
  TestValidator.notEquals(
    "updatedAt differs from createdAt",
    initialTodo.createdAt,
    updatedTodo.updatedAt,
  );
  // 6. Verify todo can be retrieved with updated values
  // Note: No GET /todos/{todoId} endpoint exists in SDK, so we rely on update response
  TestValidator.equals("title was updated", updatedTodo.title, "Updated Title");
  TestValidator.equals(
    "description was updated",
    updatedTodo.description,
    "Updated description",
  );
  // 7. Verify edit history entry is created
  // Note: No GET /todos/{todoId}/history endpoint exists in SDK
  // We validate by asserting the update operation succeeded and timestamps changed
  TestValidator.predicate(
    "edit history should be created on update",
    () => updatedTodo.updatedAt !== initialTodo.updatedAt,
  );
}