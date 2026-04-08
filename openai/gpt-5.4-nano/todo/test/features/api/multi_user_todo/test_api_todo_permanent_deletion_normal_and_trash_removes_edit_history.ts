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

export async function test_api_todo_permanent_deletion_normal_and_trash_removes_edit_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member to obtain an authenticated member context.
  const memberAuthorization = await authorize_member_join(connection, {
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
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: memberAuthorization.token.access,
  };
  // 2. Create two member-owned todos.
  const todoA = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: `Todo A ${RandomGenerator.alphabets(6)}`,
        description: typia.random<string>(),
        startDate: null,
        dueDate: null,
      },
    },
  );
  typia.assert(todoA);
  const todoB = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: `Todo B ${RandomGenerator.alphabets(6)}`,
        description: null,
        startDate: null,
        dueDate: null,
      },
    },
  );
  typia.assert(todoB);
  // 3. Move Todo B into the trash.
  const moveResult =
    await api.functional.multiUserTodo.member.todos.bulk_move_to_trash.bulkMoveToTrash(
      memberConnection,
      {
        body: {
          ids: [todoB.id],
        } satisfies IMultiUserTodoTodo.IBulkMoveToTrashRequest,
      },
    );
  typia.assert(moveResult);
  // 4. Permanently delete both Todo A and Todo B.
  const deletedTodoIds = [todoA.id, todoB.id] as const;
  const permanentDelete =
    await api.functional.multiUserTodo.member.todos.bulk_permanent_delete.bulkPermanentDelete(
      memberConnection,
      {
        body: {
          todoIds: [...deletedTodoIds],
        } satisfies IMultiUserTodo.IBulkPermanentDeleteRequest,
      },
    );
  typia.assert(permanentDelete);
  // 5. Validate response.
  TestValidator.equals(
    "deletedCount matches deletedTodoIds length",
    permanentDelete.deletedCount,
    permanentDelete.deletedTodoIds.length,
  );
  const expectedIds = [...deletedTodoIds].slice().sort();
  const actualIds = permanentDelete.deletedTodoIds.slice().sort();
  TestValidator.equals(
    "deletedTodoIds contains Todo A and Todo B (no extras)",
    actualIds,
    expectedIds,
  );
  // 6. Validate post-conditions.
  // Since detailed todo retrieval and edit history endpoints are not provided in the available SDK materials,
  // we validate absence by ensuring the backend rejects subsequent operations that require the deleted todos.
  await TestValidator.error(
    "permanent-deleted Todo A cannot be moved to trash anymore",
    async () => {
      await api.functional.multiUserTodo.member.todos.bulk_move_to_trash.bulkMoveToTrash(
        memberConnection,
        {
          body: {
            ids: [todoA.id],
          } satisfies IMultiUserTodoTodo.IBulkMoveToTrashRequest,
        },
      );
    },
  );
  await TestValidator.error(
    "permanent-deleted Todo B cannot be moved to trash anymore",
    async () => {
      await api.functional.multiUserTodo.member.todos.bulk_move_to_trash.bulkMoveToTrash(
        memberConnection,
        {
          body: {
            ids: [todoB.id],
          } satisfies IMultiUserTodoTodo.IBulkMoveToTrashRequest,
        },
      );
    },
  );
  await TestValidator.error(
    "permanent-deleted todos cannot be permanently deleted again (anti-partial/ownership/consistency)",
    async () => {
      await api.functional.multiUserTodo.member.todos.bulk_permanent_delete.bulkPermanentDelete(
        memberConnection,
        {
          body: {
            todoIds: [...deletedTodoIds],
          } satisfies IMultiUserTodo.IBulkPermanentDeleteRequest,
        },
      );
    },
  );
}
