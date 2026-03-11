import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoSnapshot";
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
 * Test date range filtering capabilities for todo snapshots when a todo has
 * snapshot records spanning multiple time periods. Create member account and
 * todo, generate snapshots at different timestamps by editing the todo,
 * then use date range filtering parameters (created_after, created_before)
 * to retrieve snapshots from specific time periods. Verify that the filtering
 * works correctly - only snapshots within the specified date range are
 * returned, pagination respects filtered results, and snapshot metadata
 * accurately reflects creation timestamps. Test edge cases like empty results
 * when no snapshots exist in the date range.
 */
export async function test_api_todo_snapshots_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member authentication connection using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create a todo using utility function
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
  // 3. Generate snapshots at different timestamps by editing the todo
  // We'll create 5 snapshots with varying timestamps by modifying todo properties
  // The API automatically creates snapshots when todo is edited
  const snapshotTimestamps: string[] = [];
  // First edit - change title
  const edit1 = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: `${todo.title} (updated 1)`,
        description: todo.description,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(edit1);
  // Wait a bit and get current timestamp for filtering tests
  await new Promise((resolve) => setTimeout(resolve, 100));
  const midTimestamp = new Date().toISOString();
  // Second edit - change description
  const edit2 = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: edit1.title,
        description: `${todo.description} (updated 2)`,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(edit2);
  snapshotTimestamps.push(new Date().toISOString());
  // Wait a bit more
  await new Promise((resolve) => setTimeout(resolve, 100));
  const afterMidTimestamp = new Date().toISOString();
  // Third edit - mark as completed
  const edit3 = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: edit2.title,
        description: edit2.description,
        startDate: new Date().toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(edit3);
  // Fourth edit - change due date
  const edit4 = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: edit3.title,
        description: edit3.description,
        dueDate: new Date(Date.now() + 86400000).toISOString(), // tomorrow
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(edit4);
  // Fifth edit - final change
  const edit5 = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: `${edit4.title} (final)`,
        description: edit4.description,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(edit5);
  const finalTimestamp = new Date().toISOString();
  // 4. Test date range filtering
  // 4.1 Get all snapshots without filters as baseline
  const allSnapshots =
    await api.functional.multiUserTodo.member.todos.snapshots.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 50,
        } satisfies IMultiUserTodoTodoSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  TestValidator.predicate("has snapshots", allSnapshots.data.length >= 5);
  TestValidator.predicate(
    "pagination records",
    allSnapshots.pagination.records >= 5,
  );
  // 4.2 Filter with created_after (get snapshots after midTimestamp)
  const afterSnapshots =
    await api.functional.multiUserTodo.member.todos.snapshots.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          created_after: midTimestamp,
          page: 1,
          limit: 50,
        } satisfies IMultiUserTodoTodoSnapshot.IRequest,
      },
    );
  typia.assert(afterSnapshots);
  // All snapshots after midTimestamp should have created_at > midTimestamp
  afterSnapshots.data.forEach((snapshot) => {
    TestValidator.predicate(
      "created after filter",
      snapshot.created_at > midTimestamp,
    );
  });
  // 4.3 Filter with created_before (get snapshots before afterMidTimestamp)
  const beforeSnapshots =
    await api.functional.multiUserTodo.member.todos.snapshots.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          created_before: afterMidTimestamp,
          page: 1,
          limit: 50,
        } satisfies IMultiUserTodoTodoSnapshot.IRequest,
      },
    );
  typia.assert(beforeSnapshots);
  // All snapshots before afterMidTimestamp should have created_at < afterMidTimestamp
  beforeSnapshots.data.forEach((snapshot) => {
    TestValidator.predicate(
      "created before filter",
      snapshot.created_at < afterMidTimestamp,
    );
  });
  // 4.4 Filter with both created_after and created_before (get snapshots in range)
  const rangeSnapshots =
    await api.functional.multiUserTodo.member.todos.snapshots.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          created_after: midTimestamp,
          created_before: finalTimestamp,
          page: 1,
          limit: 50,
        } satisfies IMultiUserTodoTodoSnapshot.IRequest,
      },
    );
  typia.assert(rangeSnapshots);
  // All snapshots should be within the range
  rangeSnapshots.data.forEach((snapshot) => {
    TestValidator.predicate(
      "in date range",
      snapshot.created_at > midTimestamp &&
        snapshot.created_at < finalTimestamp,
    );
  });
  // 5. Test pagination respects filtered results
  const paginatedSnapshots =
    await api.functional.multiUserTodo.member.todos.snapshots.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          created_after: midTimestamp,
          page: 1,
          limit: 2,
        } satisfies IMultiUserTodoTodoSnapshot.IRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  TestValidator.equals(
    "pagination limit",
    paginatedSnapshots.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "data length <= limit",
    paginatedSnapshots.data.length <= 2,
  );
  // 6. Test empty results when no snapshots exist in the date range
  // Use a date far in the future where no snapshots exist
  const futureDate = new Date(Date.now() + 86400000 * 365).toISOString(); // 1 year in future
  const emptySnapshots =
    await api.functional.multiUserTodo.member.todos.snapshots.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          created_after: futureDate,
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoTodoSnapshot.IRequest,
      },
    );
  typia.assert(emptySnapshots);
  TestValidator.equals(
    "empty results for future date",
    emptySnapshots.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for future date",
    emptySnapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for future date",
    emptySnapshots.pagination.pages,
    0,
  );
  // 7. Validate snapshot metadata
  const firstSnapshot = allSnapshots.data[0];
  TestValidator.predicate(
    "snapshot has id",
    typeof firstSnapshot.id === "string" && firstSnapshot.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot has title",
    typeof firstSnapshot.title === "string" && firstSnapshot.title.length > 0,
  );
  TestValidator.predicate(
    "snapshot has created_at",
    typeof firstSnapshot.created_at === "string" &&
      firstSnapshot.created_at.length > 0,
  );
}
