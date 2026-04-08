import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSnapshot";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSnapshot";
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
 * Test retrieving empty snapshot history for an unedited todo.
 *
 * Validates that when a todo is created but never edited, querying its snapshot history returns an empty data array with valid pagination metadata. This ensures the system correctly handles the edge case where todos exist without any edit history.
 *
 * The test follows this workflow:
 * 1. Authenticate a member account using the join utility function
 * 2. Create a new todo without making any subsequent edits
 * 3. Query the snapshots endpoint for the created todo
 * 4. Verify the response contains an empty data array
 * 5. Validate pagination metadata shows zero records and current page 1
 *
 * This edge case is important because newly created todos naturally have no edit history, and the API must handle this gracefully without errors or unexpected behavior.
 */
export async function test_api_todo_edit_history_empty_when_no_edits(
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
  // 2. Create a todo without editing it
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Query snapshots for the unedited todo
  const snapshots = await api.functional.todoApp.member.todos.snapshots.index(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        limit: 20,
      } satisfies ITodoAppSnapshot.IRequest,
    },
  );
  typia.assert(snapshots);
  // 4. Validate empty data array
  TestValidator.equals("data array is empty", snapshots.data.length, 0);
  // 5. Validate pagination metadata
  TestValidator.equals("current page is 1", snapshots.pagination.current, 1);
  TestValidator.equals("total records is 0", snapshots.pagination.records, 0);
  TestValidator.equals("total pages is 0", snapshots.pagination.pages, 0);
  TestValidator.predicate("limit is positive", snapshots.pagination.limit > 0);
}
