import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppEditHistory";
import type { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
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
 * Test viewing a todo's edit history after multiple edits with different field combinations.
 *
 * Validates that editing a todo twice—first changing only the title, then changing description, start date, and due date—produces exactly two edit history entries sorted from most recent to oldest. The most recent entry must have all field snapshots populated (title, description, start_date, due_date), while the older entry must have only the title populated and null for all other fields, since only the title was changed in that edit.
 *
 * Pagination metadata is verified to confirm the total record count and page structure are correct. This test ensures the edit history correctly captures only changed fields per business rules and maintains proper chronological ordering.
 *
 * 1. Member joins and authenticates to establish a session.
 * 2. Member creates a todo with initial title and description.
 * 3. Member performs first edit — changes only the title, leaving description unchanged.
 * 4. Member performs second edit — changes description, sets start date and due date.
 * 5. Member views the edit history page.
 * 6. Validates exactly two entries exist, sorted most-recent-first, with correct field snapshots per entry.
 */
export async function test_api_edit_history_view_with_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a todo with initial title and description
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: initialTitle,
        description: initialDescription,
      },
    },
  );
  typia.assert(todo);
  // 3. First edit: change only the title
  const firstEditTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedTodo1 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: firstEditTitle,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo1);
  // 4. Second edit: change description, start date, and due date
  const secondEditDescription = RandomGenerator.paragraph({ sentences: 3 });
  const secondEditStartDate =
    new Date().toISOString() satisfies string as string &
      tags.Format<"date-time">;
  const secondEditDueDate = new Date(
    Date.now() + 86400000,
  ).toISOString() satisfies string as string & tags.Format<"date-time">;
  const updatedTodo2 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: firstEditTitle,
        description: secondEditDescription,
        start_date: secondEditStartDate,
        due_date: secondEditDueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo2);
  // 5. View edit history
  const historyPage =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {} satisfies ITodoAppEditHistory.IRequest,
      },
    );
  typia.assert(historyPage);
  // 6. Validate results
  TestValidator.equals(
    "pagination total records",
    historyPage.pagination.records,
    2,
  );
  TestValidator.equals("history entries count", historyPage.data.length, 2);
  // Most recent entry (index 0): second edit — all fields populated
  const mostRecent = historyPage.data[0];
  TestValidator.equals("most recent title", mostRecent.title, firstEditTitle);
  TestValidator.equals(
    "most recent description",
    mostRecent.description,
    secondEditDescription,
  );
  TestValidator.predicate(
    "most recent start_date is populated",
    mostRecent.start_date !== null,
  );
  TestValidator.predicate(
    "most recent due_date is populated",
    mostRecent.due_date !== null,
  );
  // Older entry (index 1): first edit — only title populated, others null
  const older = historyPage.data[1];
  TestValidator.equals("older title", older.title, firstEditTitle);
  TestValidator.equals("older description is null", older.description, null);
  TestValidator.equals("older start_date is null", older.start_date, null);
  TestValidator.equals("older due_date is null", older.due_date, null);
}
