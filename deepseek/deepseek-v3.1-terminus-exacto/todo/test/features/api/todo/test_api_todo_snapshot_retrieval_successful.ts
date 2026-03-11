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

export async function test_api_todo_snapshot_retrieval_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a todo with complete details
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(), // tomorrow
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Create a snapshot of the todo's current state
  const snapshot =
    await api.functional.multiUserTodo.member.todos.snapshots.create(
      memberConnection,
      {
        todoId: todo.id,
      },
    );
  typia.assert(snapshot);
  // 4. Retrieve the specific snapshot using the snapshot.at endpoint
  const retrieved =
    await api.functional.multiUserTodo.member.todos.snapshots.at(
      memberConnection,
      {
        todoId: todo.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate that all captured properties match the original todo state exactly
  // Compare snapshot properties with original todo state
  TestValidator.equals("snapshot ID matches", retrieved.id, snapshot.id);
  TestValidator.equals(
    "snapshot title matches todo title",
    retrieved.title,
    todo.title,
  );
  TestValidator.equals(
    "snapshot description matches todo description",
    retrieved.description,
    todo.description,
  );
  TestValidator.equals(
    "snapshot startDate matches todo start_date",
    retrieved.startDate,
    todo.start_date,
  );
  TestValidator.equals(
    "snapshot dueDate matches todo due_date",
    retrieved.dueDate,
    todo.due_date,
  );
  // The snapshot's isCompleted should match the todo's is_completed (default false)
  TestValidator.equals(
    "snapshot isCompleted matches todo is_completed",
    retrieved.isCompleted,
    todo.is_completed,
  );
  // The snapshot's isDeleted should be false since todo is not deleted
  TestValidator.equals(
    "snapshot isDeleted is false",
    retrieved.isDeleted,
    false,
  );
  // Validate parent todo relationship
  TestValidator.equals(
    "snapshot references correct todo",
    retrieved.multiUserTodoTodoId,
    todo.id,
  );
  // Validate snapshot creation timestamp is recorded
  TestValidator.predicate("snapshot createdAt is valid ISO date", () => {
    const date = new Date(retrieved.createdAt);
    return !isNaN(date.getTime());
  });
  // Validate the retrieved snapshot is exactly the same as the created snapshot
  TestValidator.equals(
    "retrieved snapshot matches original snapshot",
    retrieved,
    snapshot,
  );
}
