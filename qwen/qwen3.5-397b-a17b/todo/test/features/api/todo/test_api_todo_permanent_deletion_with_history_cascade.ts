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
 * Test that permanent deletion cascades to remove all associated edit history entries.
 *
 * Workflow:
 * 1. Authenticate as a member using authorize_member_join utility
 * 2. Create a todo item using generate_random_todo_app_member_todos_create utility
 * 3. Update the todo multiple times to generate edit history entries
 * 4. Soft delete the todo to move it to trash
 * 5. Permanently delete the todo (should cascade delete all history)
 * 6. Validate the permanent deletion completes successfully
 */
export async function test_api_todo_permanent_deletion_with_history_cascade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a todo item using utility function
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      },
    },
  );
  typia.assert(todo);
  TestValidator.equals("todo owner matches", todo.member.id, memberAuth.id);
  // 3. Update the todo multiple times to generate edit history entries
  const update1 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(update1);
  TestValidator.notEquals(
    "title changed after first update",
    todo.title,
    update1.title,
  );
  const update2 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        due_date: new Date(Date.now() + 86400000 * 14).toISOString(),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(update2);
  TestValidator.notEquals(
    "title changed after second update",
    update1.title,
    update2.title,
  );
  const update3 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        description: null,
        start_date: null,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(update3);
  TestValidator.predicate("description cleared", update3.description === null);
  // 4. Soft delete the todo to move it to trash
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 5. Permanently delete the todo (should cascade delete all history entries)
  // The successful completion without error validates the cascade deletion worked
  await api.functional.todoApp.member.todos.permanent.erase(memberConnection, {
    todoId: todo.id,
  });
}
