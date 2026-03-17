import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_private_todo_app_member_todos_create } from "../../../generate/generate_random_private_todo_app_member_todos_create";
import { prepare_random_private_todo_app_todo } from "../../../prepare/prepare_random_private_todo_app_todo";

export async function test_api_trash_restore_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a todo with specific data
  const originalTitle = RandomGenerator.paragraph({ sentences: 2 });
  const originalDescription = RandomGenerator.paragraph({ sentences: 3 });
  const originalStartDate = new Date().toISOString();
  const originalDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const todo = await generate_random_private_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: originalTitle,
        description: originalDescription,
        start_date: originalStartDate,
        due_date: originalDueDate,
      },
    },
  );
  typia.assert(todo);
  // 3. Delete the todo (move to trash)
  await api.functional.privateTodoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. Restore the todo from trash
  const restored = await api.functional.privateTodoApp.member.trash.restore(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(restored);
  // 5. Verify restoration - deleted_at should be null
  TestValidator.equals("deleted_at is null", restored.deleted_at, null);
  // 6. Verify all original attributes are preserved
  TestValidator.equals("title preserved", restored.title, todo.title);
  TestValidator.equals(
    "description preserved",
    restored.description,
    todo.description,
  );
  TestValidator.equals(
    "start_date preserved",
    restored.start_date,
    todo.start_date,
  );
  TestValidator.equals("due_date preserved", restored.due_date, todo.due_date);
  TestValidator.equals(
    "completed preserved",
    restored.completed,
    todo.completed,
  );
  TestValidator.equals("member preserved", restored.member.id, todo.member.id);
  // 7. Verify updated_at has been refreshed
  TestValidator.predicate(
    "updated_at refreshed",
    restored.updated_at > todo.updated_at,
  );
}
