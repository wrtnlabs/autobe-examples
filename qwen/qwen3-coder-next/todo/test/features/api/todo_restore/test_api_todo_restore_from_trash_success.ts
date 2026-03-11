import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
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
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(typia.random<string>()),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com/ref",
    } satisfies ITodoAppMemberSession.IJoin,
  });
  memberConnection.headers = { Authorization: joinResult.token.access };
  typia.assert(joinResult);
  // 2. Create a todo item with metadata
  const createdTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  // 3. Delete the todo to move it to trash
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: createdTodo.id,
  });
  // 4. Restore the todo from trash
  const restoredTodo = await api.functional.todoApp.member.trash.restore(
    memberConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(restoredTodo);
  // 5. Verify the restored todo has correct data
  TestValidator.equals(
    "title preserved",
    restoredTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "description preserved",
    restoredTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "is_complete preserved",
    restoredTodo.is_complete,
    createdTodo.is_complete,
  );
  TestValidator.equals(
    "is_trashed preserved",
    restoredTodo.is_trashed,
    createdTodo.is_trashed,
  );
  TestValidator.equals(
    "start_date preserved",
    restoredTodo.start_date,
    createdTodo.start_date,
  );
  TestValidator.equals(
    "due_date preserved",
    restoredTodo.due_date,
    createdTodo.due_date,
  );
  TestValidator.equals("deleted_at cleared", restoredTodo.deleted_at, null);
  // 6. Verify user ownership is preserved
  TestValidator.equals(
    "user id preserved",
    restoredTodo.user.id,
    joinResult.member.id,
  );
}