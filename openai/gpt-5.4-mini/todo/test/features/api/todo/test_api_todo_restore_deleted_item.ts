import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_restore_deleted_item(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(authorized);
  const title = RandomGenerator.paragraph({ sentences: 2 });
  const description = RandomGenerator.content({ paragraphs: 1 });
  const startAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const dueAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const created = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title,
        description,
        start_at: startAt,
        due_at: dueAt,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(created);
  const trashedBefore = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        completionStatus: "all",
        sort: "createdAtDesc",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashedBefore);
  const trashedItem = trashedBefore.data.find((item) => item.id === created.id);
  TestValidator.predicate(
    "todo should exist in trash before restore",
    () => trashedItem !== undefined && trashedItem.deleted_at !== null,
  );
  const restored =
    await api.functional.todoApp.member.todos.trash.restore.patchByTodoid(
      memberConnection,
      {
        todoId: created.id,
      },
    );
  typia.assert(restored);
  TestValidator.equals("restored todo id", restored.id, created.id);
  TestValidator.equals("restored title", restored.title, created.title);
  TestValidator.equals(
    "restored description",
    restored.description,
    created.description,
  );
  TestValidator.equals(
    "restored start_at",
    restored.start_at,
    created.start_at,
  );
  TestValidator.equals("restored due_at", restored.due_at, created.due_at);
  TestValidator.equals(
    "restored owner id",
    restored.member.id,
    created.member.id,
  );
  TestValidator.equals(
    "restored completion state",
    restored.is_completed,
    created.is_completed,
  );
  TestValidator.equals(
    "restored created_at",
    restored.created_at,
    created.created_at,
  );
  TestValidator.predicate(
    "restored todo should be active",
    restored.deleted_at === null,
  );
  const trashedAfter = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        completionStatus: "all",
        sort: "createdAtDesc",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashedAfter);
  TestValidator.predicate("restored todo should not remain in trash", () =>
    trashedAfter.data.every((item) => item.id !== created.id),
  );
}
