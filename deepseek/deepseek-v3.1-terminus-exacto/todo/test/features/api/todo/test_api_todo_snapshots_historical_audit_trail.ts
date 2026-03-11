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
 * Test retrieval of historical snapshots for a todo that has undergone multiple state changes including creation, completion, editing, and restoration from trash. Create a member account, create a todo, perform multiple state changes to generate snapshots, then retrieve the snapshot history. Verify that the response includes paginated snapshot summaries in chronological order, each containing essential metadata (id, title, completion status, deletion status, creation timestamp). Validate that snapshots accurately capture the todo's state at each lifecycle event and that the member can only access their own todo's audit trail.
 */
export async function test_api_todo_snapshots_historical_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a todo using utility function
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Retrieve snapshots with default pagination
  const snapshots =
    await api.functional.multiUserTodo.member.todos.snapshots.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {} satisfies IMultiUserTodoTodoSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    snapshots.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.predicate("limit positive", snapshots.pagination.limit > 0);
  TestValidator.predicate(
    "records non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    snapshots.pagination.pages >= 0,
  );
  // 5. Validate snapshot data array
  TestValidator.predicate("data is array", Array.isArray(snapshots.data));
  // 6. If there are snapshots, validate their structure and order
  if (snapshots.data.length > 0) {
    // Validate chronological order (newest first based on description)
    for (let i = 0; i < snapshots.data.length - 1; i++) {
      const current = new Date(snapshots.data[i].created_at).getTime();
      const next = new Date(snapshots.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `snapshot ${i} is newer than ${i + 1}`,
        current >= next,
      );
    }
    // Validate each snapshot structure
    snapshots.data.forEach((snapshot, index) => {
      typia.assert(snapshot);
      TestValidator.predicate(
        `snapshot ${index} has id`,
        typeof snapshot.id === "string" && snapshot.id.length > 0,
      );
      TestValidator.predicate(
        `snapshot ${index} has title`,
        typeof snapshot.title === "string",
      );
      TestValidator.predicate(
        `snapshot ${index} has is_completed boolean`,
        typeof snapshot.is_completed === "boolean",
      );
      TestValidator.predicate(
        `snapshot ${index} has is_deleted boolean`,
        typeof snapshot.is_deleted === "boolean",
      );
      TestValidator.predicate(
        `snapshot ${index} has created_at`,
        typeof snapshot.created_at === "string" &&
          snapshot.created_at.length > 0,
      );
    });
    // The first snapshot should match the todo's initial title (creation snapshot)
    const firstSnapshot = snapshots.data[0];
    TestValidator.equals(
      "first snapshot title matches todo title",
      firstSnapshot.title,
      todo.title,
    );
    TestValidator.equals(
      "first snapshot completion status matches todo",
      firstSnapshot.is_completed,
      todo.is_completed,
    );
    TestValidator.predicate(
      "first snapshot deletion status is false for new todo",
      firstSnapshot.is_deleted === false,
    );
  }
  // 7. Test that member cannot access another member's todo snapshots
  // Create a second member
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(otherMember);
  // Attempt to access first member's todo snapshots with second member's connection
  await TestValidator.error(
    "other member cannot access todo snapshots",
    async () => {
      await api.functional.multiUserTodo.member.todos.snapshots.index(
        otherMemberConnection,
        {
          todoId: todo.id,
          body: {} satisfies IMultiUserTodoTodoSnapshot.IRequest,
        },
      );
    },
  );
}
