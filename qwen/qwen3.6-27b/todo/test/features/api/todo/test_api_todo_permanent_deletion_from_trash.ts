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

/**
 * Test permanent deletion of a todo from trash with cascade deletion of edit history.
 *
 * Validates the complete lifecycle of a todo from creation through permanent deletion. The workflow authenticates a member, creates a todo, edits it to generate edit history entries, soft-deletes the todo to move it to trash, and finally permanently deletes it from the trash. The permanent deletion cascades to remove all associated edit history entries within a database transaction.
 *
 * 1. Authenticate a new member to establish ownership context.
 * 2. Create a todo with title and optional description.
 * 3. Edit the todo to generate edit history entries for cascade validation.
 * 4. Soft-delete the todo to move it into the trash.
 * 5. Permanently delete the todo from trash, cascading edit history deletion.
 */
export async function test_api_todo_permanent_deletion_from_trash(
  connection: api.IConnection,
) {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<ITodoAppMember.IJoin>,
  });
  // 2. Create a todo
  const todo =
    await generate_random_todo_app_member_todos_create(memberConnection);
  typia.assert(todo);
  // 3. Edit the todo to generate edit history entries
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Soft-delete the todo to move it to trash
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 5. Permanently delete the todo from trash
  await api.functional.todoApp.member.todos.permanent_delete.permanentErase(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
}
