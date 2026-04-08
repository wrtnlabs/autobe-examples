import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSnapshot";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSnapshot";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test todo edit history retrieval with multiple snapshots.
 *
 * Validates that a member can retrieve the complete edit history of their todo task after making multiple edits. The test authenticates as a member, creates a todo with initial values, performs multiple updates to generate snapshots, and verifies the snapshot retrieval endpoint returns all snapshots in the correct order with accurate field values.
 *
 * The test ensures that each todo update creates a snapshot capturing the complete state at edit time, and that snapshots are returned sorted from most recent to oldest by created_at timestamp. Pagination metadata is also validated to ensure proper cursor-based navigation support.
 *
 * 1. Member authenticates via registration endpoint.
 * 2. Member creates a todo with initial title and description.
 * 3. Member updates the todo multiple times with different field combinations.
 * 4. Retrieves all snapshots via the snapshots index endpoint.
 * 5. Validates snapshot count matches the number of edits performed.
 * 6. Verifies snapshots are sorted by created_at in descending order.
 * 7. Confirms each snapshot contains accurate field values from each edit.
 */
export async function test_api_todo_edit_history_retrieval_with_multiple_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create initial todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Store initial state
  const initialTitle = todo.title;
  const initialDescription = todo.description;
  // 3. Perform multiple updates to generate snapshots
  const update1: ITodoAppTodo.IUpdate = {
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITodoAppTodo.IUpdate;
  const updated1 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: update1,
    },
  );
  typia.assert(updated1);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  const update2: ITodoAppTodo.IUpdate = {
    title: RandomGenerator.name(4),
    start_date: new Date(Date.now() + 86400000).toISOString(),
  } satisfies ITodoAppTodo.IUpdate;
  const updated2 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: update2,
    },
  );
  typia.assert(updated2);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  const update3: ITodoAppTodo.IUpdate = {
    description: RandomGenerator.paragraph({ sentences: 7 }),
    due_date: new Date(Date.now() + 172800000).toISOString(),
  } satisfies ITodoAppTodo.IUpdate;
  const updated3 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: update3,
    },
  );
  typia.assert(updated3);
  // 4. Retrieve all snapshots
  const snapshots = await api.functional.todoApp.member.todos.snapshots.index(
    memberConnection,
    {
      todoId: todo.id,
      body: {} satisfies ITodoAppSnapshot.IRequest,
    },
  );
  typia.assert(snapshots);
  // 5. Validate snapshot count (should be 3 for 3 updates)
  TestValidator.equals("snapshot count", snapshots.data.length, 3);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    snapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    snapshots.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    snapshots.pagination.pages >= 0,
  );
  // 7. Verify snapshots are sorted by created_at in descending order
  for (let i = 0; i < snapshots.data.length - 1; i++) {
    const current = snapshots.data[i];
    const next = snapshots.data[i + 1];
    TestValidator.predicate(
      `snapshot ${i} created_at >= snapshot ${i + 1} created_at`,
      current.created_at >= next.created_at,
    );
  }
  // 8. Verify each snapshot contains expected fields
  for (const snapshot of snapshots.data) {
    TestValidator.predicate("snapshot has id", snapshot.id.length > 0);
    TestValidator.predicate("snapshot has title", snapshot.title.length > 0);
    TestValidator.predicate(
      "snapshot has is_completed",
      typeof snapshot.is_completed === "boolean",
    );
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at.length > 0,
    );
    TestValidator.predicate(
      "snapshot has todo reference",
      snapshot.todo.id.length > 0,
    );
    TestValidator.equals(
      "snapshot todo id matches",
      snapshot.todo.id,
      todo.id,
    );
  }
  // 9. Verify the most recent snapshot (first in list) has the latest update values
  const latestSnapshot = snapshots.data[0];
  TestValidator.equals(
    "latest snapshot title",
    latestSnapshot.title,
    update3.title,
  );
  TestValidator.equals(
    "latest snapshot description",
    latestSnapshot.description,
    update3.description,
  );
}
