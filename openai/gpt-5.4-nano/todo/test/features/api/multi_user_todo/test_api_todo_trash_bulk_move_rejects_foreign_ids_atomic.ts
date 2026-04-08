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

export async function test_api_todo_trash_bulk_move_rejects_foreign_ids_atomic(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test bulk move-to-trash atomic rejection when requesting foreign todo ids.
   *
   * Validates that Member A cannot move Member B’s todo into Member A’s trash.
   * Ensures all-or-nothing transaction semantics by requiring movedCount to be 0
   * when any foreign id is included.
   *
   * 1. Member A and Member B join as isolated authenticated principals.
   * 2. Each member creates one todo owned by itself.
   * 3. Member A calls bulk-move-to-trash with both ids (including foreign id).
   * 4. Validate movedCount is 0.
   * 5. Validate transactionality indirectly by confirming each owner can still
   *    move its own todo to trash afterward (meaning the earlier request caused
   *    no committed state changes).
   */

  // 1. Member A join
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      display_name: `member-a-${RandomGenerator.alphabets(6)}`,
      password: `pwd-${RandomGenerator.alphabets(12)}`,
      href: "about:blank",
      referrer: "about:blank",
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });

  // 2. Member B join
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      display_name: `member-b-${RandomGenerator.alphabets(6)}`,
      password: `pwd-${RandomGenerator.alphabets(12)}`,
      href: "about:blank",
      referrer: "about:blank",
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });

  // 3. Create Todo A owned by Member A
  const todoA = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: {
        title: `Todo A ${RandomGenerator.alphabets(8)}`,
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todoA);

  // 4. Create Todo B owned by Member B
  const todoB = await generate_random_multi_user_todo_member_todos_create(
    memberBConnection,
    {
      body: {
        title: `Todo B ${RandomGenerator.alphabets(8)}`,
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todoB);

  // 5. Member A attempts bulk move with both ids (including foreign id)
  const foreignBulkRequest = {
    ids: [todoA.id, todoB.id],
  } satisfies IMultiUserTodoTodo.IBulkMoveToTrashRequest;

  const foreignBulkResult =
    await api.functional.multiUserTodo.member.todos.bulk_move_to_trash.bulkMoveToTrash(
      memberAConnection,
      {
        body: foreignBulkRequest,
      },
    );
  typia.assert(foreignBulkResult);

  // Validate atomicity: no updates committed when foreign ids are included.
  TestValidator.equals(
    "movedCount must be 0 when foreign ids are provided",
    foreignBulkResult.movedCount,
    0,
  );

  // 6. Validate transactionality indirectly:
  //    - Member A should still be able to move its own todo to trash.
  const memberAToTrash =
    await api.functional.multiUserTodo.member.todos.bulk_move_to_trash.bulkMoveToTrash(
      memberAConnection,
      {
        body: {
          ids: [todoA.id],
        } satisfies IMultiUserTodoTodo.IBulkMoveToTrashRequest,
      },
    );
  typia.assert(memberAToTrash);
  TestValidator.equals(
    "Member A should still be able to move its own todo to trash after rejection",
    memberAToTrash.movedCount,
    1,
  );

  //    - Member B should still be able to move its own todo to trash.
  const memberBToTrash =
    await api.functional.multiUserTodo.member.todos.bulk_move_to_trash.bulkMoveToTrash(
      memberBConnection,
      {
        body: {
          ids: [todoB.id],
        } satisfies IMultiUserTodoTodo.IBulkMoveToTrashRequest,
      },
    );
  typia.assert(memberBToTrash);
  TestValidator.equals(
    "Member B should still be able to move its own todo to trash after Member A rejection",
    memberBToTrash.movedCount,
    1,
  );
}
