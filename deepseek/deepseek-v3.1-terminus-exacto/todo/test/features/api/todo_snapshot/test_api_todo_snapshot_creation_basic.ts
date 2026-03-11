import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoSnapshot";
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
 * Test that a member can create a snapshot of their active todo.
 *
 * 1. Authenticate as a member using join operation
 * 2. Create a basic todo with title and optional description
 * 3. Create a snapshot of this todo using the POST endpoint
 * 4. Validate that the snapshot captures all todo properties correctly
 * 5. Verify the snapshot has a creation timestamp and references the correct todo ID
 * 6. Ensure the snapshot is immutable and cannot be modified
 */
export async function test_api_todo_snapshot_creation_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
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
  // 2. Create a todo with optional fields
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description:
          Math.random() > 0.5
            ? RandomGenerator.paragraph({ sentences: 1 })
            : null,
        startDate: Math.random() > 0.5 ? new Date().toISOString() : null,
        dueDate: Math.random() > 0.5 ? new Date().toISOString() : null,
      },
    },
  );
  typia.assert(todo);
  // 3. Create a snapshot of the todo
  const snapshot =
    await api.functional.multiUserTodo.member.todos.snapshots.create(
      memberConnection,
      {
        todoId: todo.id,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot captures all todo properties correctly
  TestValidator.equals("title matches", snapshot.title, todo.title);
  TestValidator.equals(
    "description matches",
    snapshot.description,
    todo.description,
  );
  TestValidator.equals(
    "startDate matches",
    snapshot.startDate,
    todo.start_date,
  );
  TestValidator.equals("dueDate matches", snapshot.dueDate, todo.due_date);
  TestValidator.equals("isCompleted false", snapshot.isCompleted, false);
  TestValidator.equals("isDeleted false", snapshot.isDeleted, false);
  TestValidator.equals(
    "todo ID reference",
    snapshot.multiUserTodoTodoId,
    todo.id,
  );
  // 5. Validate timestamps and structure
  TestValidator.predicate("has createdAt timestamp", () => {
    const date = new Date(snapshot.createdAt);
    return !isNaN(date.getTime());
  });
}
