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

/**
 * Test that soft-deleted todos are excluded from the detail view endpoint.
 *
 * Validates that when a todo is soft-deleted via the erase endpoint, it becomes
 * inaccessible through the detail retrieval endpoint (GET /todoApp/member/todos/{todoId}).
 * The endpoint must return a not-found error, confirming that soft-deleted todos
 * are only accessible through dedicated trash browsing endpoints and are strictly
 * excluded from the active todo detail view.
 *
 * 1. A new member registers and authenticates via the join endpoint.
 * 2. The member creates a todo with a random title.
 * 3. The member soft-deletes the todo, moving it to the trash.
 * 4. The member attempts to retrieve the soft-deleted todo through the detail endpoint.
 * 5. The request is rejected with a not-found error, proving soft-deleted todos are hidden.
 */
export async function test_api_todo_detail_soft_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Soft-delete the todo
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. Attempt to retrieve the soft-deleted todo — must fail with not-found
  await TestValidator.error(
    "soft-deleted todo not found via detail endpoint",
    async () => {
      await api.functional.todoApp.member.todos.at(memberConnection, {
        todoId: todo.id,
      });
    },
  );
}
