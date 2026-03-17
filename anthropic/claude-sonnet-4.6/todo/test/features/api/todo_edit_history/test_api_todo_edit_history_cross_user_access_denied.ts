import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEditHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
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

export async function test_api_todo_edit_history_cross_user_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // ── Step 1: Register Member A ────────────────────────────────────────────
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // ── Step 2: Member A creates a todo ──────────────────────────────────────
  const todo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todo);
  // ── Step 3: Member A edits the todo to generate an edit history entry ────
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberAConnection,
    {
      todoId: todo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        is_completed: false,
        started_at: null,
        due_at: null,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // ── Step 4: Member A lists edit histories to retrieve a valid historyId ──
  const historyPage =
    await api.functional.todoApp.member.todos.editHistories.index(
      memberAConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 10,
          sortOrder: "asc",
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(historyPage);
  TestValidator.predicate(
    "at least one edit history entry exists",
    historyPage.data.length > 0,
  );
  const historyEntry = historyPage.data[0]!;
  // ── Step 5: Register Member B (separate account) ─────────────────────────
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // ── Step 6 & 7: Member B attempts to access Member A's edit history ───────
  // Must be denied with 403 or 404 — the system must not reveal another
  // member's data regardless of whether the resource exists.
  await TestValidator.error(
    "Member B cannot access Member A's todo edit history",
    async () => {
      await api.functional.todoApp.member.todos.editHistories.at(
        memberBConnection,
        {
          todoId: todo.id,
          historyId: historyEntry.id,
        },
      );
    },
  );
}
