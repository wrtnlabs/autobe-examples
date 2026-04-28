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
 * Test retrieval of todo edit history after multiple sequential field edits.
 *
 * Validates the complete edit history workflow: after a member creates a todo and performs multiple edits changing different field subsets, the edit history endpoint returns correctly structured paginated entries. Each history entry records only the fields actually modified during that specific edit operation, with unchanged fields appearing as null.
 *
 * Special attention is given to verifying field-level granularity: unchanged fields must be null (not the previous values), timestamps are present on every entry, and entries are sorted in descending chronological order (most recent first).
 *
 * 1. Member registers and authenticates via authorization utility.
 * 2. Member creates a todo with initial title only (no description or dates).
 * 3. First edit: change only the title → history records title=newTitle, description/null, start_date=null, due_date=null.
 * 4. Second edit: change description and start_date → history records title=null, description=newDesc, start_date=newDate, due_date=null.
 * 5. Third edit: change only the due_date → history records title=null, description=null, start_date=null, due_date=newDue.
 * 6. Retrieve paginated edit history and validate pagination metadata (current, limit, records=3, pages).
 * 7. Validate entries are sorted by created_at descending and each entry contains the expected changed fields.
 */
export async function test_api_todo_edit_history_retrieval_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a todo with initial title only
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // 3. First edit - change only the title
  const edit1NewTitle = RandomGenerator.name();
  const edit1Body = {
    title: edit1NewTitle,
  } satisfies ITodoAppTodo.IUpdate;
  const afterEdit1 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: edit1Body,
    },
  );
  typia.assert(afterEdit1);
  // 4. Second edit - change description and start_date
  const edit2NewDescription = RandomGenerator.paragraph({ sentences: 3 });
  const edit2NewStartDate = "2025-06-15T10:00:00.000Z";
  const edit2Body = {
    title: afterEdit1.title,
    description: edit2NewDescription,
    start_date: edit2NewStartDate,
  } satisfies ITodoAppTodo.IUpdate;
  const afterEdit2 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: edit2Body,
    },
  );
  typia.assert(afterEdit2);
  // 5. Third edit - change only the due_date
  const edit3NewDueDate = "2025-07-01T23:59:59.000Z";
  const edit3Body = {
    title: afterEdit2.title,
    due_date: edit3NewDueDate,
  } satisfies ITodoAppTodo.IUpdate;
  const afterEdit3 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: edit3Body,
    },
  );
  typia.assert(afterEdit3);
  // 6. Retrieve paginated edit history
  const historyResponse =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: { page: 1, limit: 10 } satisfies ITodoAppEditHistory.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 7. Validate pagination metadata - expects exactly 3 edit history records
  TestValidator.equals(
    "pagination current page",
    historyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    historyResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total edit history records",
    historyResponse.pagination.records,
    3,
  );
  TestValidator.predicate(
    "at least one page available",
    historyResponse.pagination.pages >= 1,
  );
  TestValidator.equals("entries in data array", historyResponse.data.length, 3);
  // 8. Validate descending sort by created_at (most recent first)
  const timestamps = historyResponse.data.map((entry) => entry.created_at);
  TestValidator.predicate(
    "entries sorted by created_at descending",
    timestamps[0] >= timestamps[1] && timestamps[1] >= timestamps[2],
  );
  // 9. Validate entry 0 (most recent - edit 3: changed only due_date)
  const entryMostRecent = historyResponse.data[0];
  TestValidator.equals(
    "most recent entry - title is null",
    entryMostRecent.title,
    null,
  );
  TestValidator.equals(
    "most recent entry - description is null",
    entryMostRecent.description,
    null,
  );
  TestValidator.equals(
    "most recent entry - start_date is null",
    entryMostRecent.start_date,
    null,
  );
  TestValidator.predicate(
    "most recent entry - has due_date",
    entryMostRecent.due_date !== null,
  );
  TestValidator.equals(
    "most recent entry - due_date value",
    entryMostRecent.due_date!,
    edit3NewDueDate,
  );
  // 10. Validate entry 1 (middle - edit 2: changed description and start_date)
  const entryMiddle = historyResponse.data[1];
  TestValidator.equals("middle entry - title is null", entryMiddle.title, null);
  TestValidator.predicate(
    "middle entry - has description",
    entryMiddle.description !== null,
  );
  TestValidator.equals(
    "middle entry - description value",
    entryMiddle.description!,
    edit2NewDescription,
  );
  TestValidator.predicate(
    "middle entry - has start_date",
    entryMiddle.start_date !== null,
  );
  TestValidator.equals(
    "middle entry - start_date value",
    entryMiddle.start_date!,
    edit2NewStartDate,
  );
  TestValidator.equals(
    "middle entry - due_date is null",
    entryMiddle.due_date,
    null,
  );
  // 11. Validate entry 2 (oldest - edit 1: changed only title)
  const entryOldest = historyResponse.data[2];
  TestValidator.predicate(
    "oldest entry - has title",
    entryOldest.title !== null,
  );
  TestValidator.equals(
    "oldest entry - title value",
    entryOldest.title!,
    edit1NewTitle,
  );
  TestValidator.equals(
    "oldest entry - description is null",
    entryOldest.description,
    null,
  );
  TestValidator.equals(
    "oldest entry - start_date is null",
    entryOldest.start_date,
    null,
  );
  TestValidator.equals(
    "oldest entry - due_date is null",
    entryOldest.due_date,
    null,
  );
}
