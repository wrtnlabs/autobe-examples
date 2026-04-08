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

export async function test_api_todo_trash_bulk_move_idempotent_when_already_trashed(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate idempotency of bulk-move-to-trash when the todo is already trashed.
   *
   * 1. Join as a member.
   * 2. Create one normal todo owned by the authenticated member.
   * 3. Bulk move the todo to trash and verify movedCount and that the todo is now marked as trashed via dashboard summary.
   * 4. Call bulk move to trash again with the same todo id and verify movedCount is 0 (no re-transition) and the todo remains in trashed state.
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
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  // 2. Create one normal todo owned by the authenticated member.
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // 3. Bulk move the todo to trash.
  const bulkMoveResult1 =
    await api.functional.multiUserTodo.member.todos.bulk_move_to_trash.bulkMoveToTrash(
      memberConnection,
      {
        body: {
          ids: [todo.id],
        } satisfies IMultiUserTodoTodo.IBulkMoveToTrashRequest,
      },
    );
  typia.assert(bulkMoveResult1);
  TestValidator.equals(
    "movedCount (first move)",
    bulkMoveResult1.movedCount,
    1,
  );
  const summary1 =
    await api.functional.multiUserTodo.member.dashboard.todos.summary.at(
      memberConnection,
    );
  typia.assert(summary1);
  TestValidator.equals("todoId matches (first move)", summary1.todoId, todo.id);
  TestValidator.predicate(
    "deletedAt is not null after move",
    summary1.deletedAt !== null,
  );
  // 5. Bulk move again with the same id (idempotency).
  const bulkMoveResult2 =
    await api.functional.multiUserTodo.member.todos.bulk_move_to_trash.bulkMoveToTrash(
      memberConnection,
      {
        body: {
          ids: [todo.id],
        } satisfies IMultiUserTodoTodo.IBulkMoveToTrashRequest,
      },
    );
  typia.assert(bulkMoveResult2);
  TestValidator.equals(
    "movedCount (second move)",
    bulkMoveResult2.movedCount,
    0,
  );
  const summary2 =
    await api.functional.multiUserTodo.member.dashboard.todos.summary.at(
      memberConnection,
    );
  typia.assert(summary2);
  TestValidator.equals(
    "todoId matches (second move)",
    summary2.todoId,
    todo.id,
  );
  TestValidator.predicate(
    "deletedAt remains not null",
    summary2.deletedAt !== null,
  );
}
