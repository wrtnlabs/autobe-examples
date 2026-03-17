import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoHistory";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

/**
 * Test retrieving edit history for a todo that has been edited multiple times.
 * 1. Authenticate as a member
 * 2. Create a todo with initial values
 * 3. First update: change the due date to create initial history entry
 * 4. Second update: change the title to create another history entry
 * 5. Retrieve history list and verify:
 *    - Contains exactly 2 history entries
 *    - Entries ordered by most recent first (created_at descending)
 *    - Each entry contains correct todo state (title, description, start_date, due_date, is_completed)
 *    - Pagination metadata is present (current, limit, records, pages)
 */
export async function test_api_todo_history_retrieve_after_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a todo with initial values
  const initialTodo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Initial Todo Title",
        description: "Initial description for the todo task",
        startDate: new Date("2026-03-01T00:00:00.000Z").toISOString(),
        dueDate: new Date("2026-03-20T00:00:00.000Z").toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(initialTodo);
  // Store initial values for later comparison
  const initialDueDate = initialTodo.dueDate;
  const initialStartDate = initialTodo.startDate;
  const initialDescription = initialTodo.description;
  // 3. First update: change the due date to create initial history entry
  const newDueDate = new Date("2026-03-25T00:00:00.000Z").toISOString();
  const afterFirstUpdate =
    await api.functional.multiUserTodo.member.todos.update(memberConnection, {
      todoId: initialTodo.id,
      body: {
        due_date: newDueDate,
      } satisfies IMultiUserTodoTodo.IUpdate,
    });
  typia.assert(afterFirstUpdate);
  TestValidator.equals(
    "due date updated correctly",
    afterFirstUpdate.dueDate,
    newDueDate,
  );
  // 4. Second update: change the title to create another history entry
  const newTitle = "Updated Todo Title";
  const afterSecondUpdate =
    await api.functional.multiUserTodo.member.todos.update(memberConnection, {
      todoId: initialTodo.id,
      body: {
        title: newTitle,
      } satisfies IMultiUserTodoTodo.IUpdate,
    });
  typia.assert(afterSecondUpdate);
  TestValidator.equals(
    "title updated correctly",
    afterSecondUpdate.title,
    newTitle,
  );
  // 5. Retrieve history list
  const historyResponse: IPageIMultiUserTodoHistory.ISummary =
    await api.functional.multiUserTodo.member.todos.histories.index(
      memberConnection,
      {
        todoId: initialTodo.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoHistory.IRequest,
      },
    );
  typia.assert(historyResponse);
  // Validate pagination metadata
  const pagination = historyResponse.pagination;
  TestValidator.equals("pagination current page", pagination.current, 1);
  TestValidator.equals("pagination limit", pagination.limit, 10);
  TestValidator.equals("pagination records count", pagination.records, 2);
  TestValidator.predicate(
    "pagination pages calculated",
    pagination.pages === 1,
  );
  // Validate history entries count
  const histories = historyResponse.data;
  TestValidator.equals("history entries count", histories.length, 2);
  // Validate entries are ordered by most recent first (created_at descending)
  TestValidator.predicate(
    "histories ordered by most recent first",
    new Date(histories[0].created_at).getTime() >
      new Date(histories[1].created_at).getTime(),
  );
  // Validate latest history entry (after second update - title change)
  const latestHistory = histories[0];
  TestValidator.equals("latest history title", latestHistory.title, newTitle);
  TestValidator.equals(
    "latest history description",
    latestHistory.description,
    initialDescription,
  );
  TestValidator.equals(
    "latest history start_date",
    latestHistory.start_date,
    initialStartDate,
  );
  TestValidator.equals(
    "latest history due_date",
    latestHistory.due_date,
    newDueDate,
  );
  TestValidator.predicate(
    "latest history is_completed",
    typeof latestHistory.is_completed === "boolean",
  );
  // Validate previous history entry (after first update - due date change)
  const previousHistory = histories[1];
  TestValidator.equals(
    "previous history title",
    previousHistory.title,
    initialTodo.title,
  );
  TestValidator.equals(
    "previous history description",
    previousHistory.description,
    initialDescription,
  );
  TestValidator.equals(
    "previous history start_date",
    previousHistory.start_date,
    initialStartDate,
  );
  TestValidator.equals(
    "previous history due_date",
    previousHistory.due_date,
    initialDueDate,
  );
  TestValidator.predicate(
    "previous history is_completed",
    typeof previousHistory.is_completed === "boolean",
  );
}
