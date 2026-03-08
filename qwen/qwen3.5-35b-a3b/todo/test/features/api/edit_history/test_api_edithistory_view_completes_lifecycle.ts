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

export async function test_api_edithistory_view_completes_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create todo with initial title and description
  const todoConnection: api.IConnection = { host: connection.host };
  const todo = await api.functional.todoApp.member.todos.create(
    todoConnection,
    {
      body: {
        title: "Initial Todo Title",
        description: "Initial description",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Edit title (first history entry)
  const updatedTodo1 = await api.functional.todoApp.member.todos.update(
    todoConnection,
    {
      todoId: todo.id,
      body: {
        title: "Edited Title 1",
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo1);
  // 4. Edit description (second history entry)
  const updatedTodo2 = await api.functional.todoApp.member.todos.update(
    todoConnection,
    {
      todoId: todo.id,
      body: {
        description: "Updated description",
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo2);
  // 5. Edit start date and due date (third history entry)
  const startDate = new Date().toISOString();
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const updatedTodo3 = await api.functional.todoApp.member.todos.update(
    todoConnection,
    {
      todoId: todo.id,
      body: {
        start_date: startDate,
        due_date: dueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo3);
  // 6. Complete the todo
  const updatedTodo4 = await api.functional.todoApp.member.todos.update(
    todoConnection,
    {
      todoId: todo.id,
      body: {
        is_complete: true,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo4);
  // 7. Edit title again (fourth history entry)
  const updatedTodo5 = await api.functional.todoApp.member.todos.update(
    todoConnection,
    {
      todoId: todo.id,
      body: {
        title: "Edited Title 2",
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo5);
  // 8. Retrieve edit history (all entries, newest first)
  const history = await api.functional.todoApp.member.todos.history.index(
    todoConnection,
    {
      todoId: todo.id,
      body: {
        sort: "createdAt-desc",
      } satisfies ITodoAppEditHistory.IRequest,
    },
  );
  typia.assert(history);
  // 9. Validate history has exactly 4 entries
  TestValidator.equals("edit history has 4 entries", history.data.length, 4);
  TestValidator.equals(
    "pagination records matches",
    history.pagination.records,
    4,
  );
  TestValidator.equals(
    "pagination limit is correct",
    history.pagination.limit,
    20,
  );
  // 10. Validate sorting (newest first)
  const createdDates = history.data.map((entry) => entry.created_at);
  for (let i = 0; i < createdDates.length - 1; i++) {
    TestValidator.predicate(
      `entry ${i} is newer than entry ${i + 1}`,
      createdDates[i] > createdDates[i + 1],
    );
  }
  // 11. Validate all entries have correct member ID
  for (const entry of history.data) {
    TestValidator.equals(`entry member ID matches`, entry.member.id, member.id);
    TestValidator.equals(
      `entry member email matches`,
      entry.member.email,
      member.email,
    );
  }
  // 12. Validate specific field changes
  // Entry 1 (newest): title change from "Edited Title 1" to "Edited Title 2"
  const firstEntry = history.data[0];
  typia.assert(firstEntry);
  TestValidator.equals(
    "first entry has new title",
    firstEntry.new_title,
    "Edited Title 2",
  );
  TestValidator.equals(
    "first entry has previous title",
    firstEntry.previous_title,
    "Edited Title 1",
  );
  // Entry 2: start_date and due_date changes
  const secondEntry = history.data[1];
  typia.assert(secondEntry);
  TestValidator.equals(
    "second entry has start_date",
    secondEntry.new_start_date,
    startDate,
  );
  TestValidator.equals(
    "second entry has due_date",
    secondEntry.new_due_date,
    dueDate,
  );
  // Entry 3: description change
  const thirdEntry = history.data[2];
  typia.assert(thirdEntry);
  TestValidator.equals(
    "third entry has new description",
    thirdEntry.new_description,
    "Updated description",
  );
  // Entry 4 (oldest): initial title change from "Initial Todo Title" to "Edited Title 1"
  const fourthEntry = history.data[3];
  typia.assert(fourthEntry);
  TestValidator.equals(
    "fourth entry has new title",
    fourthEntry.new_title,
    "Edited Title 1",
  );
  TestValidator.equals(
    "fourth entry has previous title",
    fourthEntry.previous_title,
    "Initial Todo Title",
  );
  // 13. Validate unchanged fields are null
  // For title change entries, description should be null
  const titleChangeEntries = history.data.filter(
    (entry) => entry.new_title !== undefined && entry.new_title !== null,
  );
  for (const entry of titleChangeEntries) {
    TestValidator.equals(
      `title change entry has null description`,
      entry.new_description,
      null,
    );
    TestValidator.equals(
      `title change entry has null previous_description`,
      entry.previous_description,
      null,
    );
  }
  // 14. Validate date range filtering
  const latestTimestamp = history.data[0].created_at;
  const filterHistory = await api.functional.todoApp.member.todos.history.index(
    todoConnection,
    {
      todoId: todo.id,
      body: {
        createdAtFrom: latestTimestamp,
      } satisfies ITodoAppEditHistory.IRequest,
    },
  );
  typia.assert(filterHistory);
  TestValidator.equals(
    "filter by date returns 1 entry",
    filterHistory.data.length,
    1,
  );
  // 15. Validate title filtering
  const titleFilteredHistory =
    await api.functional.todoApp.member.todos.history.index(todoConnection, {
      todoId: todo.id,
      body: {
        previousTitle: "Edited Title 1",
      } satisfies ITodoAppEditHistory.IRequest,
    });
  typia.assert(titleFilteredHistory);
  TestValidator.equals(
    "filter by previous title returns 1 entry",
    titleFilteredHistory.data.length,
    1,
  );
}
