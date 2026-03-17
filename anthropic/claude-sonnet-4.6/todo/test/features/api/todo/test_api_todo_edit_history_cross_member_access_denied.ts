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

export async function test_api_todo_edit_history_cross_member_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // ─── Step 1: Register Member A ───────────────────────────────────────
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // ─── Step 2: Member A creates a todo ─────────────────────────────────
  const todo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todo);
  // ─── Step 3: Member A edits the todo (creates an edit history entry) ──
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
  // ─── Step 4: Register Member B ───────────────────────────────────────
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // ─── Step 5: Member B tries to access Member A's todo edit history ────
  // Expect: error (403 or 404) — ownership isolation enforced
  await TestValidator.httpError(
    "Member B cannot access Member A's todo edit history",
    [403, 404],
    async () => {
      await api.functional.todoApp.member.todos.editHistories.index(
        memberBConnection,
        {
          todoId: todo.id,
          body: {} satisfies ITodoAppTodoEditHistory.IRequest,
        },
      );
    },
  );
  // ─── Step 6: Member A trashes the todo ───────────────────────────────
  await api.functional.todoApp.member.todos.erase(memberAConnection, {
    todoId: todo.id,
  });
  // ─── Step 7: Member A can still access edit history of a trashed todo ─
  const historyPage =
    await api.functional.todoApp.member.todos.editHistories.index(
      memberAConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 20,
          sortOrder: "asc",
        } satisfies ITodoAppTodoEditHistory.IRequest,
      },
    );
  typia.assert(historyPage);
  // Verify the edit history data array is non-empty (the edit we made above was recorded)
  TestValidator.predicate(
    "edit history data should contain at least one entry after trashing",
    historyPage.data.length > 0,
  );
}
