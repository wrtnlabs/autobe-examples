import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistory";
import type { IMultiUserTodoEditHistoryFieldChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryFieldChange";
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
 * Test hierarchical resource validation when accessing field changes.
 * Create a todo and attempt to access field changes using invalid hierarchical
 * relationships (wrong todoId or historyId). Verify that the system properly
 * rejects requests where resources don't exist or don't belong in the hierarchy.
 * This validates the hierarchical integrity checks in the resource access path.
 */
export async function test_api_todo_edit_history_field_change_hierarchy_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a todo to establish resource hierarchy
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Generate random UUIDs for invalid hierarchical combinations
  const randomTodoId = typia.random<string & tags.Format<"uuid">>();
  const randomHistoryId = typia.random<string & tags.Format<"uuid">>();
  const randomFieldChangeId = typia.random<string & tags.Format<"uuid">>();
  // 4. Test with valid todoId but random historyId and fieldChangeId
  // This should fail because history doesn't belong to todo
  await TestValidator.httpError(
    "history does not belong to todo",
    [404, 403],
    async () =>
      await api.functional.multiUserTodo.member.todos.edit_histories.field_changes.at(
        memberConnection,
        {
          todoId: todo.id,
          historyId: randomHistoryId,
          fieldChangeId: randomFieldChangeId,
        },
      ),
  );
  // 5. Test with completely random IDs (todo doesn't exist)
  await TestValidator.httpError(
    "todo does not exist",
    [404, 403],
    async () =>
      await api.functional.multiUserTodo.member.todos.edit_histories.field_changes.at(
        memberConnection,
        {
          todoId: randomTodoId,
          historyId: randomHistoryId,
          fieldChangeId: randomFieldChangeId,
        },
      ),
  );
  // Note: We cannot test successful case without ability to create edit histories
  // through todo edit operations (endpoint not provided in SDK).
  // This test validates that hierarchical validation rejects invalid combinations.
}
