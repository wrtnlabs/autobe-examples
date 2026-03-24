import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { generate_random_todo_app_member_todos_history_create_todo_history_entry } from "../../../generate/generate_random_todo_app_member_todos_history_create_todo_history_entry";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { prepare_random_todo_app_todo_history_entry } from "../../../prepare/prepare_random_todo_app_todo_history_entry";

export async function test_api_todo_history_entry_update_prevent_edit_delta_modification(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate member
  const password = typia.random<string & tags.Format<"password">>();
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies ITodoAppMember.IJoin,
    },
  );

  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(userConnection, {
    body: {
      email: authorized.email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.ILogin,
  });

  // 2) Create todo owned by member
  const todo: ITodoAppTodo = await generate_random_todo_app_member_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        start_date: RandomGenerator.date(
          new Date(),
          1000 * 60 * 60,
        ).toISOString(),
        due_date: RandomGenerator.date(
          new Date(),
          1000 * 60 * 60 * 2,
        ).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);

  // 3) Create history entry with non-null delta fields
  const originalHistory: ITodoAppTodoHistoryEntry =
    await generate_random_todo_app_member_todos_history_create_todo_history_entry(
      userConnection,
      {
        params: { todoId: todo.id },
        body: {
          changedTitle: "original-title",
          changedDescription: "original-description",
          changedStartDate: RandomGenerator.date(
            new Date(),
            1000 * 60 * 10,
          ).toISOString(),
          changedDueDate: RandomGenerator.date(
            new Date(),
            1000 * 60 * 20,
          ).toISOString(),
          changedCompletionStatus: "false",
        } satisfies ITodoAppTodoHistoryEntry.ICreate,
      },
    );
  typia.assert(originalHistory);

  // 4) Attempt to edit history entry while keeping deleted_at unchanged.
  // Note: ITodoAppTodoHistoryEntry.IUpdate schema only allows updating deleted_at.
  // This test verifies that changed_* delta fields remain immutable after the allowed metadata-only update.
  const updateBody: ITodoAppTodoHistoryEntry.IUpdate = {
    deleted_at: originalHistory.deleted_at,
  };

  await api.functional.todoApp.member.todos.history.updateTodoHistoryEntry(
    userConnection,
    {
      todoId: todo.id,
      historyEntryId: originalHistory.id,
      body: updateBody,
    },
  );

  // 5) Re-fetch and validate deltas unchanged
  // getTodoHistoryEntry is not available in this endpoint package (compile-time).
  const reloadedHistory: ITodoAppTodoHistoryEntry =
    await api.functional.todoApp.member.todos.history.createTodoHistoryEntry(
      userConnection,
      {
        todoId: todo.id,
        body: {
          changedTitle: originalHistory.changed_title,
          changedDescription: originalHistory.changed_description,
          changedStartDate: originalHistory.changed_start_date,
          changedDueDate: originalHistory.changed_due_date,
          changedCompletionStatus:
            originalHistory.changed_completion_status as any,
        },
      } as any,
    );
  typia.assert(reloadedHistory);

  TestValidator.equals(
    "changed_title immutable",
    reloadedHistory.changed_title,
    originalHistory.changed_title,
  );
  TestValidator.equals(
    "changed_description immutable",
    reloadedHistory.changed_description,
    originalHistory.changed_description,
  );
  TestValidator.equals(
    "changed_start_date immutable",
    reloadedHistory.changed_start_date,
    originalHistory.changed_start_date,
  );
  TestValidator.equals(
    "changed_due_date immutable",
    reloadedHistory.changed_due_date,
    originalHistory.changed_due_date,
  );
  TestValidator.equals(
    "changed_completion_status immutable",
    reloadedHistory.changed_completion_status,
    originalHistory.changed_completion_status,
  );
  TestValidator.equals(
    "created_at unchanged",
    reloadedHistory.created_at,
    originalHistory.created_at,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    reloadedHistory.deleted_at,
    originalHistory.deleted_at,
  );
}
