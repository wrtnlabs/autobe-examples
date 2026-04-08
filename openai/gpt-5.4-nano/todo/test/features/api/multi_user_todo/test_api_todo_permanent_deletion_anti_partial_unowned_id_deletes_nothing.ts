import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
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

export async function test_api_todo_permanent_deletion_anti_partial_unowned_id_deletes_nothing(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test anti-partial behavior for multi-user todo bulk permanent deletion.
   *
   * Validates that when member A sends a bulk permanent delete request
   * containing a mix of owned and unowned todo IDs, the backend does not
   * perform partial deletions. Instead, it must either reject the request
   * or return a result that indicates nothing was permanently deleted.
   *
   * 1. Member A creates OwnedA.
   * 2. Member B creates OwnedB.
   * 3. Member A attempts to permanently delete both IDs.
   * 4. The operation must not permanently delete OwnedA due to the presence
   *    of an unowned ID.
   * 5. OwnedA and OwnedB remain deletable afterward, proving no permanent
   *    deletion occurred during the failing mixed-ownership request.
   */
  // 1) Member A join
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      display_name: "member-a",
    },
  });
  // 2) Member A creates OwnedA
  const ownedATitle = `OwnedA-${RandomGenerator.alphabets(10)}`;
  const ownedA = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: {
        title: ownedATitle,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(ownedA);
  // 3) Member B join
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      display_name: "member-b",
    },
  });
  // 4) Member B creates OwnedB
  const ownedBTitle = `OwnedB-${RandomGenerator.alphabets(10)}`;
  const ownedB = await generate_random_multi_user_todo_member_todos_create(
    memberBConnection,
    {
      body: {
        title: ownedBTitle,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(ownedB);
  // 6) Member A attempts bulk permanent delete with [OwnedA, OwnedB]
  const bulkRequest = {
    todoIds: [ownedA.id, ownedB.id],
  } satisfies IMultiUserTodo.IBulkPermanentDeleteRequest;
  let bulkSucceeded = false;
  let bulkResult: IMultiUserTodo.IBulkPermanentDeleteResult | undefined;
  try {
    const result =
      await api.functional.multiUserTodo.member.todos.bulk_permanent_delete.bulkPermanentDelete(
        memberAConnection,
        {
          body: bulkRequest,
        },
      );
    typia.assert(result);
    bulkSucceeded = true;
    bulkResult = result;
  } catch {
    // Expected path: reject the request due to unowned todoId.
  }
  // 7) Validate anti-partial outcome: no successful partial deletion.
  if (bulkSucceeded) {
    // Accept either an explicit no-op result (deletedCount=0) as the
    // “anti-partial success” case.
    TestValidator.equals(
      "bulk delete must not delete any todo when unowned id is included",
      bulkResult!.deletedCount,
      0,
    );
    TestValidator.equals(
      "deletedTodoIds must be empty when anti-partial abort happens",
      bulkResult!.deletedTodoIds,
      [],
    );
  } else {
    // If rejected, it's also acceptable for anti-partial guarantee.
    TestValidator.predicate(
      "bulk delete rejected as expected due to unowned todoId",
      true,
    );
  }
  // 8) Validate anti-partial persistence: OwnedA and OwnedB were not
  // permanently deleted by the failed mixed request.
  const singleOwnedADelete =
    await api.functional.multiUserTodo.member.todos.bulk_permanent_delete.bulkPermanentDelete(
      memberAConnection,
      {
        body: {
          todoIds: [ownedA.id],
        } satisfies IMultiUserTodo.IBulkPermanentDeleteRequest,
      },
    );
  typia.assert(singleOwnedADelete);
  TestValidator.equals(
    "member A can still permanently delete its own todo after mixed request",
    singleOwnedADelete.deletedCount,
    1,
  );
  TestValidator.equals(
    "deletedTodoIds contains OwnedA.id",
    singleOwnedADelete.deletedTodoIds,
    [ownedA.id],
  );
  const singleOwnedBDelete =
    await api.functional.multiUserTodo.member.todos.bulk_permanent_delete.bulkPermanentDelete(
      memberBConnection,
      {
        body: {
          todoIds: [ownedB.id],
        } satisfies IMultiUserTodo.IBulkPermanentDeleteRequest,
      },
    );
  typia.assert(singleOwnedBDelete);
  TestValidator.equals(
    "member B can permanently delete its own todo",
    singleOwnedBDelete.deletedCount,
    1,
  );
  TestValidator.equals(
    "deletedTodoIds contains OwnedB.id",
    singleOwnedBDelete.deletedTodoIds,
    [ownedB.id],
  );
  TestValidator.predicate(
    "member sessions are established",
    memberAAuthorized.id.length > 0 && memberBAuthorized.id.length > 0,
  );
}
