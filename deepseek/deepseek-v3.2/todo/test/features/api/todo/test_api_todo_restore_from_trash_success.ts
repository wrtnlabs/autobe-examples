import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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

export async function test_api_todo_restore_from_trash_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a todo with complete attributes
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    start_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ITodoAppTodo.ICreate;
  const originalTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    { body: createBody },
  );
  typia.assert(originalTodo);
  // 3. Soft-delete the todo to move it to trash
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: originalTodo.id,
  });
  // 4. Restore the soft-deleted todo
  const restoredTodo = await api.functional.todoApp.member.todos.restore(
    memberConnection,
    { todoId: originalTodo.id },
  );
  typia.assert(restoredTodo);
  // 5. Validate that all original attributes are intact
  TestValidator.equals("title matches", restoredTodo.title, originalTodo.title);
  TestValidator.equals(
    "description matches",
    restoredTodo.description,
    originalTodo.description,
  );
  TestValidator.equals(
    "start_date matches",
    restoredTodo.start_date,
    originalTodo.start_date,
  );
  TestValidator.equals(
    "due_date matches",
    restoredTodo.due_date,
    originalTodo.due_date,
  );
  TestValidator.equals(
    "completed status matches",
    restoredTodo.completed,
    originalTodo.completed,
  );
  TestValidator.equals("member ID matches", restoredTodo.member.id, member.id);
  // 6. Verify todo is accessible after restoration (can be fetched)
  // Since we don't have a "get by ID" API, we'll validate through other means
  // The fact that restore returned the todo successfully indicates it's accessible
  // 7. Verify the todo can be soft-deleted and restored again (testing lifecycle)
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: restoredTodo.id,
  });
  const restoredAgain = await api.functional.todoApp.member.todos.restore(
    memberConnection,
    { todoId: restoredTodo.id },
  );
  typia.assert(restoredAgain);
  TestValidator.equals(
    "todo can be restored multiple times",
    restoredAgain.id,
    originalTodo.id,
  );
}
