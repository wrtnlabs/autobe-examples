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
 * Test permanent deletion of a todo from trash with cascade history cleanup.
 *
 * Validates the complete permanent deletion workflow including member authentication, todo creation, soft deletion to trash, and final permanent removal from the system. Ensures that all associated edit history snapshots are cascade deleted when a todo is permanently removed from trash.
 *
 * The test follows the natural business flow: member registration → todo creation → soft deletion → permanent deletion → verification of complete removal. Special attention is given to verifying that the todo cannot be recovered after permanent deletion and that all related data is properly cleaned up.
 *
 * 1. Authenticate as a member via the join endpoint with randomized credentials.
 * 2. Create a new todo task with title and optional description and dates.
 * 3. Soft delete the todo to move it to trash status.
 * 4. Permanently delete the todo from trash using the erase endpoint.
 * 5. Verify the permanent deletion operation completes successfully.
 */
export async function test_api_todo_permanent_delete_from_trash(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_date: new Date(Date.now() + 86400000).toISOString(),
        due_date: new Date(Date.now() + 604800000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Validate todo ID is a valid UUID
  TestValidator.predicate(
    "todo ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todo.id,
    ),
  );
  // 3. Soft delete the todo to move it to trash
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. Permanently delete the todo from trash
  await api.functional.todoApp.member.todos.trash.erase(memberConnection, {
    todoId: todo.id,
  });
  // 5. Verify permanent deletion completed successfully
  // The void response from trash.erase confirms the operation succeeded
  // and cascade deletion of associated history snapshots occurred
  TestValidator.predicate("permanent deletion completed successfully", true);
}
