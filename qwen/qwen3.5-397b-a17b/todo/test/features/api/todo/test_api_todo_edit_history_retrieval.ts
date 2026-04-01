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

/**
 * Test retrieving a specific edit history entry for a todo owned by the authenticated member.
 *
 * Test Steps:
 * 1. Register a new member account
 * 2. Create a todo with title and description
 * 3. Note: Update endpoint not available - cannot create actual edit history
 * 4. Test history retrieval endpoint with valid parameters
 * 5. Validate response structure
 */
export async function test_api_todo_edit_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2. Create a todo with title and description
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Test history retrieval endpoint
  // Note: Update endpoint not available in provided API functions
  // Cannot create actual edit history entries without update operation
  // Testing endpoint structure and response validation with available APIs
  const historyId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve history entry
  // In production with update endpoint: would get historyId from update response or history list
  const history = await api.functional.multiUserTodo.member.todos.history.at(
    memberConnection,
    {
      todoId: todo.id,
      historyId: historyId,
    },
  );
  // 4. Validate response structure matches IMultiUserTodoTodoEditHistory
  // typia.assert performs complete validation including all fields and types
  typia.assert(history);
}
