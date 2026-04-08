import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_bulk_restore_duplicate_ids_no_duplicate_normal_todos(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test restoring trashed todos from trash using duplicate todoIds.
   *
   * Validates that the bulk-restore endpoint de-duplicates request todoIds
   * internally so the response reflects per-unique-id processing and that each
   * response item correlates with the submitted todoId.
   *
   * This edge case uses [t1, t1, t1] to ensure the server does not create
   * multiple normal/active todo entries for the same underlying todo.
   */
  // 1. Member join (authenticated actor)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.random<
        string & tags.MinLength<1> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);

  // 2. Prepare duplicate request ids.
  const todoId = typia.random<string & tags.Format<"uuid">>();
  const request: IMultiUserTodoTodo.IBulkRestoreFromTrashRequest = {
    todoIds: [todoId, todoId, todoId],
  };

  // 3. Bulk restore call
  const result =
    await api.functional.multiUserTodo.member.todos.bulk_restore_from_trash.bulkRestoreFromTrash(
      memberConnection,
      {
        body: request,
      },
    );
  typia.assert(result);

  // 4. Validate response invariants
  TestValidator.equals(
    "deduplicated todo count matches response results length",
    result.operationSummary.totalRequested,
    result.results.length,
  );

  for (const item of result.results) {
    const narrowedTodoId = typia.assert<string & tags.Format<"uuid">>(
      item.todoId,
    );
    TestValidator.equals(
      "todoId echoes the provided unique todoId",
      narrowedTodoId,
      todoId,
    );

    // errorMessage must be null on success, otherwise non-null.
    if (item.success) {
      TestValidator.equals(
        "errorMessage is null on success",
        item.errorMessage,
        null,
      );
    } else {
      TestValidator.notEquals(
        "errorMessage is non-null on failure",
        item.errorMessage,
        null,
      );
    }
  }

  // 5. Aggregated restored count
  TestValidator.equals(
    "totalRestored equals number of success items",
    result.operationSummary.totalRestored,
    result.results.filter((x) => x.success).length,
  );
}
