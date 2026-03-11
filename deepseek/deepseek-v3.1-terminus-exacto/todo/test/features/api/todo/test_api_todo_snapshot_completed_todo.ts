import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoCompletionStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoCompletionStatus";
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

export async function test_api_todo_snapshot_completed_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
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
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(todo);
  TestValidator.equals(
    "todo is initially incomplete",
    todo.is_completed,
    false,
  );
  // 3. Mark todo as completed
  const completedTodo =
    await api.functional.multiUserTodo.member.completion.status(
      memberConnection,
      {
        body: {} satisfies IMultiUserTodoTodoCompletionStatus.IRequest,
      },
    );
  typia.assert(completedTodo);
  TestValidator.equals(
    "todo marked as completed",
    completedTodo.is_completed,
    true,
  );
  TestValidator.equals("todo ID unchanged", completedTodo.id, todo.id);
  // 4. Create snapshot of completed todo
  const snapshot =
    await api.functional.multiUserTodo.member.todos.snapshots.create(
      memberConnection,
      {
        todoId: completedTodo.id,
      },
    );
  typia.assert(snapshot);
  // 5. Validate snapshot captures completion status
  TestValidator.equals(
    "snapshot isCompleted is true",
    snapshot.isCompleted,
    true,
  );
  TestValidator.equals(
    "snapshot title matches",
    snapshot.title,
    completedTodo.title,
  );
  TestValidator.equals(
    "snapshot description matches",
    snapshot.description,
    completedTodo.description,
  );
  TestValidator.equals(
    "snapshot startDate matches",
    snapshot.startDate,
    completedTodo.start_date,
  );
  TestValidator.equals(
    "snapshot dueDate matches",
    snapshot.dueDate,
    completedTodo.due_date,
  );
  TestValidator.equals(
    "snapshot todo ID reference",
    snapshot.multiUserTodoTodoId,
    completedTodo.id,
  );
  TestValidator.predicate(
    "snapshot isDeleted is false",
    snapshot.isDeleted === false,
  );
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshot.createdAt.length > 0,
  );
  // 6. Additional business logic validation
  TestValidator.notEquals(
    "snapshot ID is unique",
    snapshot.id,
    completedTodo.id,
  );
}
