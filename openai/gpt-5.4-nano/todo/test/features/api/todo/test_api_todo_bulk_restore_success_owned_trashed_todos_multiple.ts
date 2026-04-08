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

export async function test_api_todo_bulk_restore_success_owned_trashed_todos_multiple(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test bulk restore-from-trash for multiple owned trashed todos.
   *
   * Validates that the bulk restore endpoint accepts a list of todo IDs
   * (non-empty), returns a per-todo results array with one entry per requested
   * ID, and that operationSummary aggregates counts consistently with per-item
   * success flags.
   *
   * Note: Detailed preconditions (creating todos, moving them into trash, and
   * verifying their presence/absence across normal vs trash lists) require
   * additional todo list/mutation endpoints that were not provided in the
   * available SDK/utility surface for this test generation.
   *
   * 1) Authenticate as a member.
   * 2) Call bulk-restore-from-trash for two todo IDs.
   * 3) Validate response invariants: results cardinality and summary counts.
   * 4) Validate errorMessage nullability when success is true.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  const memberProfile = await authorize_member_join(memberConnection, {
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
  typia.assert(memberProfile);
  const todoIds = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ] as [string & tags.Format<"uuid">, string & tags.Format<"uuid">];
  const restoreResult =
    await api.functional.multiUserTodo.member.todos.bulk_restore_from_trash.bulkRestoreFromTrash(
      memberConnection,
      {
        body: {
          todoIds,
        } satisfies IMultiUserTodoTodo.IBulkRestoreFromTrashRequest,
      },
    );
  typia.assert(restoreResult);
  TestValidator.equals(
    "operationSummary.totalRequested matches number of requested todoIds",
    restoreResult.operationSummary.totalRequested,
    todoIds.length,
  );
  TestValidator.equals(
    "operationSummary.totalRestored equals count of success items",
    restoreResult.operationSummary.totalRestored,
    restoreResult.results.filter((x) => x.success).length,
  );
  TestValidator.equals(
    "results length equals operationSummary.totalRequested",
    restoreResult.results.length,
    restoreResult.operationSummary.totalRequested,
  );
  for (const item of restoreResult.results) {
    TestValidator.predicate(
      "each result item todoId is one of the requested todoIds",
      item.todoId !== null
        ? todoIds.includes(
            typia.assert<string & tags.Format<"uuid">>(item.todoId as unknown),
          )
        : false,
    );
    if (item.success) {
      TestValidator.equals(
        "successful restore items must have null errorMessage",
        item.errorMessage,
        null,
      );
    } else {
      // If failure, errorMessage must be non-null.
      TestValidator.predicate(
        "failed restore items must provide an errorMessage",
        item.errorMessage !== null,
      );
    }
  }
}
