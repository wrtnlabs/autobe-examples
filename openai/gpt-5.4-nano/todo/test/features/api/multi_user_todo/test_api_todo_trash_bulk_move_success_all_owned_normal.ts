import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
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

export async function test_api_todo_trash_bulk_move_success_all_owned_normal(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful bulk move-to-trash for all owned normal todos.
   *
   * Validates that:
   * 1. A member join creates an authenticated session for todo operations.
   * 2. Multiple todos created by the same member are eligible (normal, not deleted).
   * 3. Bulk move-to-trash transitions all provided owned todo ids into trash.
   * 4. The bulk operation result reports movedCount equal to the number of submitted ids.
   *
   * Note: The required DTOs available for this test only allow validating
   * the bulk result summary (movedCount). List separation invariants (normal
   * vs trash visibility) require dedicated list endpoints that are not
   * available in the provided SDK inputs.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.random<
        string & tags.MinLength<1> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  const todos = await Promise.all(
    ArrayUtil.repeat(3, () =>
      generate_random_multi_user_todo_member_todos_create(memberConnection, {
        body: {
          title: RandomGenerator.name(),
          description: null,
          startDate: null,
          dueDate: null,
        } satisfies IMultiUserTodoTodo.ICreate,
      }),
    ),
  );
  const ids = todos.map((t) => t.id);
  TestValidator.equals("todo ids count", ids.length, 3);
  const result =
    await api.functional.multiUserTodo.member.todos.bulk_move_to_trash.bulkMoveToTrash(
      memberConnection,
      {
        body: { ids } satisfies IMultiUserTodoTodo.IBulkMoveToTrashRequest,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "movedCount equals input ids count",
    result.movedCount,
    ids.length,
  );
}
