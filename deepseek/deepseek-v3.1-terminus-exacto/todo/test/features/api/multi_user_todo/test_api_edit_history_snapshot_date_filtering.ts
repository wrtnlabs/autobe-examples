import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoEditHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistorySnapshot";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoEditHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoEditHistorySnapshot";
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
 * Test filtering edit history snapshots by date ranges for a todo.
 *
 * 1. Create member user and todo
 * 2. Make multiple updates at different times to generate snapshots
 * 3. Test date filtering with created_after/created_before parameters
 * 4. Test with updated_after/updated_before parameters
 * 5. Test pagination with date filters
 * 6. Validate only snapshots within specified ranges are returned
 */
export async function test_api_edit_history_snapshot_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and todo
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(todo);
  // 2. Make multiple updates to generate snapshots at different times
  // First update (initial snapshot)
  await api.functional.multiUserTodo.member.todos.update(memberConnection, {
    todoId: todo.id,
    body: {
      title: "Updated Title 1",
      description: "Updated description 1",
    } satisfies IMultiUserTodoTodo.IUpdate,
  });
  // Delay to create time difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Record timestamp for middle range
  const middleTime = new Date().toISOString();
  // Second update (middle snapshot)
  await api.functional.multiUserTodo.member.todos.update(memberConnection, {
    todoId: todo.id,
    body: {
      title: "Updated Title 2",
      description: "Updated description 2",
    } satisfies IMultiUserTodoTodo.IUpdate,
  });
  // Delay to create time difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Third update (late snapshot)
  await api.functional.multiUserTodo.member.todos.update(memberConnection, {
    todoId: todo.id,
    body: {
      title: "Updated Title 3",
      description: "Updated description 3",
    } satisfies IMultiUserTodoTodo.IUpdate,
  });
  // 3. Fetch all snapshots to get timestamps
  const allSnapshots =
    await api.functional.multiUserTodo.member.todos.edit_history_snapshots.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          limit: 100,
        } satisfies IMultiUserTodoEditHistorySnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  TestValidator.equals(
    "should have at least 3 snapshots",
    allSnapshots.data.length >= 3,
    true,
  );
  // Sort snapshots by createdAt for testing
  const sortedSnapshots = [...allSnapshots.data].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  // Get timestamps for filtering tests
  const firstSnapshotTime = sortedSnapshots[0].createdAt;
  const middleSnapshotTime = sortedSnapshots[1].createdAt;
  const lastSnapshotTime =
    sortedSnapshots[sortedSnapshots.length - 1].createdAt;
  // 4. Test created_after filtering (get snapshots after first)
  const afterFirst =
    await api.functional.multiUserTodo.member.todos.edit_history_snapshots.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          created_after: firstSnapshotTime,
          limit: 100,
        } satisfies IMultiUserTodoEditHistorySnapshot.IRequest,
      },
    );
  typia.assert(afterFirst);
  TestValidator.equals(
    "created_after should exclude first snapshot",
    afterFirst.data.length,
    sortedSnapshots.length - 1,
  );
  // 5. Test created_before filtering (get snapshots before last)
  const beforeLast =
    await api.functional.multiUserTodo.member.todos.edit_history_snapshots.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          created_before: lastSnapshotTime,
          limit: 100,
        } satisfies IMultiUserTodoEditHistorySnapshot.IRequest,
      },
    );
  typia.assert(beforeLast);
  TestValidator.equals(
    "created_before should exclude last snapshot",
    beforeLast.data.length,
    sortedSnapshots.length - 1,
  );
  // 6. Test combined created_after and created_before (middle range)
  const middleRange =
    await api.functional.multiUserTodo.member.todos.edit_history_snapshots.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          created_after: firstSnapshotTime,
          created_before: lastSnapshotTime,
          limit: 100,
        } satisfies IMultiUserTodoEditHistorySnapshot.IRequest,
      },
    );
  typia.assert(middleRange);
  TestValidator.equals(
    "middle range should include middle snapshots",
    middleRange.data.length > 0,
    true,
  );
  // Verify all returned snapshots are within the range
  for (const snapshot of middleRange.data) {
    TestValidator.predicate(
      "snapshot should be after first and before last",
      new Date(snapshot.createdAt) > new Date(firstSnapshotTime) &&
        new Date(snapshot.createdAt) < new Date(lastSnapshotTime),
    );
  }
  // 7. Test empty result set with exclusive range
  const exclusiveRange =
    await api.functional.multiUserTodo.member.todos.edit_history_snapshots.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          created_after: lastSnapshotTime,
          created_before: firstSnapshotTime,
          limit: 100,
        } satisfies IMultiUserTodoEditHistorySnapshot.IRequest,
      },
    );
  typia.assert(exclusiveRange);
  TestValidator.equals(
    "exclusive range should return empty",
    exclusiveRange.data.length,
    0,
  );
  // 8. Test boundary condition (createdAt exactly equals boundary)
  const exactBoundary =
    await api.functional.multiUserTodo.member.todos.edit_history_snapshots.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          created_after: middleSnapshotTime,
          created_before: middleSnapshotTime,
          limit: 100,
        } satisfies IMultiUserTodoEditHistorySnapshot.IRequest,
      },
    );
  typia.assert(exactBoundary);
  // Should include snapshot with createdAt exactly matching boundary
  const hasExactMatch = exactBoundary.data.some(
    (snapshot) => snapshot.createdAt === middleSnapshotTime,
  );
  TestValidator.equals(
    "exact boundary should include matching snapshot",
    hasExactMatch,
    true,
  );
  // 9. Test updated_after and updated_before parameters
  const updatedRange =
    await api.functional.multiUserTodo.member.todos.edit_history_snapshots.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          updated_after: firstSnapshotTime,
          updated_before: lastSnapshotTime,
          limit: 100,
        } satisfies IMultiUserTodoEditHistorySnapshot.IRequest,
      },
    );
  typia.assert(updatedRange);
  TestValidator.predicate(
    "updated range should return results",
    updatedRange.data.length > 0,
  );
  // 10. Test pagination with date filters
  const paginatedWithFilter =
    await api.functional.multiUserTodo.member.todos.edit_history_snapshots.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          created_after: firstSnapshotTime,
          page: 1,
          limit: 1,
        } satisfies IMultiUserTodoEditHistorySnapshot.IRequest,
      },
    );
  typia.assert(paginatedWithFilter);
  TestValidator.equals(
    "paginated with filter should respect page size",
    paginatedWithFilter.data.length,
    1,
  );
  TestValidator.equals(
    "paginated with filter should have correct pagination metadata",
    paginatedWithFilter.pagination.limit,
    1,
  );
}
