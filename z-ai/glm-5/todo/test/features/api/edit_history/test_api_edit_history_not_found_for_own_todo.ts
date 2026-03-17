import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import type { IPrivateTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodoEditHistory";
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

/**
 * Test error handling when a member attempts to retrieve a non-existent
 * edit history entry for their own todo.
 *
 * Prerequisites:
 * 1. Register a new member via POST /privateTodoApp/auth/member/join
 * 2. Create a todo via POST /todos - this does NOT create any edit history
 *    (edit history only created on updates, not on creation)
 *
 * Test steps:
 * - Generate a random UUID as a fake edit history ID
 * - Call GET /todos/{todoId}/editHistories/{editHistoryId} with the valid
 *   todo ID but non-existent edit history ID
 * - Verify the request is rejected with 404 Not Found error
 *
 * Business rule validation:
 * - Edit history entries are only created when a todo is updated, not when created
 * - A valid todo may have zero edit history entries if never updated
 * - Each edit history entry is uniquely identified by its ID and must belong
 *   to the specified todo
 */
export async function test_api_edit_history_not_found_for_own_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a todo - note: creation does NOT create edit history
  const todo = await generate_random_private_todo_app_member_todos_create(
    memberConnection,
    { body: { title: "My Task" } },
  );
  typia.assert(todo);
  // 3. Generate a random UUID as a non-existent edit history ID
  const fakeEditHistoryId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to fetch non-existent edit history - should return 404
  await TestValidator.httpError(
    "edit history not found for own todo",
    404,
    async () =>
      await api.functional.privateTodoApp.member.todos.editHistories.at(
        memberConnection,
        {
          todoId: todo.id,
          editHistoryId: fakeEditHistoryId,
        },
      ),
  );
}
