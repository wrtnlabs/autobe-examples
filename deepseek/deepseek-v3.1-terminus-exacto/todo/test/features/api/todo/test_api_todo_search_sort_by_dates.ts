import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
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

export async function test_api_todo_search_sort_by_dates(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate member using utility function
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // Create todos with different date configurations
  const todos: IMultiUserTodoTodo[] = [];
  // 1. Todo with start date only
  const startDateOnly =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 2,
            wordMax: 5,
          }),
          startDate: new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 2 days ago
        },
      },
    );
  typia.assert(startDateOnly);
  todos.push(startDateOnly);
  // Wait a bit to ensure different creation timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 2. Todo with due date only
  const dueDateOnly = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 2,
          wordMax: 5,
        }),
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      },
    },
  );
  typia.assert(dueDateOnly);
  todos.push(dueDateOnly);
  // Wait a bit to ensure different creation timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Todo with both dates
  const bothDates = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 2,
          wordMax: 5,
        }),
        startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      },
    },
  );
  typia.assert(bothDates);
  todos.push(bothDates);
  // Wait a bit to ensure different creation timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Todo with no dates
  const noDates = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 2,
          wordMax: 5,
        }),
      },
    },
  );
  typia.assert(noDates);
  todos.push(noDates);
  // Helper function to search todos with sorting
  const searchWithSort = async (
    sort_by: IMultiUserTodoTodo.IRequest["sort_by"],
    sort_direction: IMultiUserTodoTodo.IRequest["sort_direction"],
  ) => {
    const searchResult = await api.functional.multiUserTodo.member.todos.index(
      memberConnection,
      {
        body: {
          sort_by,
          sort_direction,
          page: 1,
          limit: 100,
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
    typia.assert(searchResult);
    return searchResult;
  };
  // Test 1: Sorting by creation date ascending (oldest first)
  const createdAscResult = await searchWithSort("created_at", "asc");
  TestValidator.equals(
    "should return all todos when sorting by creation date ascending",
    createdAscResult.data.length,
    todos.length,
  );
  // Verify chronological order - should match creation order
  for (let i = 0; i < createdAscResult.data.length - 1; i++) {
    const current = new Date(createdAscResult.data[i].created_at).getTime();
    const next = new Date(createdAscResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `todo at index ${i} should have earlier creation date than next todo`,
      current <= next,
    );
  }
  // Test 2: Sorting by creation date descending (newest first)
  const createdDescResult = await searchWithSort("created_at", "desc");
  TestValidator.equals(
    "should return all todos when sorting by creation date descending",
    createdDescResult.data.length,
    todos.length,
  );
  // Verify reverse chronological order
  for (let i = 0; i < createdDescResult.data.length - 1; i++) {
    const current = new Date(createdDescResult.data[i].created_at).getTime();
    const next = new Date(createdDescResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `todo at index ${i} should have later creation date than next todo`,
      current >= next,
    );
  }
  // Test 3: Sorting by start date ascending (earliest first)
  const startAscResult = await searchWithSort("start_date", "asc");
  TestValidator.equals(
    "should return all todos when sorting by start date ascending",
    startAscResult.data.length,
    todos.length,
  );
  // Verify todos without start dates appear at the end
  const todosWithStartDate = todos.filter((t) => t.start_date !== null);
  const todosWithoutStartDate = todos.filter((t) => t.start_date === null);
  // First group should have todos with start dates in ascending order
  for (let i = 0; i < todosWithStartDate.length - 1; i++) {
    const current = startAscResult.data[i];
    const next = startAscResult.data[i + 1];
    if (current.start_date && next.start_date) {
      const currentDate = new Date(current.start_date).getTime();
      const nextDate = new Date(next.start_date).getTime();
      TestValidator.predicate(
        `todo at index ${i} should have earlier or equal start date than next todo with start date`,
        currentDate <= nextDate,
      );
    }
  }
  // Last todos should be those without start dates
  for (
    let i = startAscResult.data.length - todosWithoutStartDate.length;
    i < startAscResult.data.length;
    i++
  ) {
    TestValidator.equals(
      `todo at index ${i} should have null start_date`,
      startAscResult.data[i].start_date,
      null,
    );
  }
  // Test 4: Sorting by start date descending (latest first)
  const startDescResult = await searchWithSort("start_date", "desc");
  TestValidator.equals(
    "should return all todos when sorting by start date descending",
    startDescResult.data.length,
    todos.length,
  );
  // Verify todos without start dates appear at the end
  // First todos should have start dates in descending order
  for (let i = 0; i < todosWithStartDate.length - 1; i++) {
    const current = startDescResult.data[i];
    const next = startDescResult.data[i + 1];
    if (current.start_date && next.start_date) {
      const currentDate = new Date(current.start_date).getTime();
      const nextDate = new Date(next.start_date).getTime();
      TestValidator.predicate(
        `todo at index ${i} should have later or equal start date than next todo with start date`,
        currentDate >= nextDate,
      );
    }
  }
  // Last todos should be those without start dates
  for (
    let i = startDescResult.data.length - todosWithoutStartDate.length;
    i < startDescResult.data.length;
    i++
  ) {
    TestValidator.equals(
      `todo at index ${i} should have null start_date`,
      startDescResult.data[i].start_date,
      null,
    );
  }
  // Test 5: Sorting by due date ascending (earliest first)
  const dueAscResult = await searchWithSort("due_date", "asc");
  TestValidator.equals(
    "should return all todos when sorting by due date ascending",
    dueAscResult.data.length,
    todos.length,
  );
  const todosWithDueDate = todos.filter((t) => t.due_date !== null);
  const todosWithoutDueDate = todos.filter((t) => t.due_date === null);
  // First group should have todos with due dates in ascending order
  for (let i = 0; i < todosWithDueDate.length - 1; i++) {
    const current = dueAscResult.data[i];
    const next = dueAscResult.data[i + 1];
    if (current.due_date && next.due_date) {
      const currentDate = new Date(current.due_date).getTime();
      const nextDate = new Date(next.due_date).getTime();
      TestValidator.predicate(
        `todo at index ${i} should have earlier or equal due date than next todo with due date`,
        currentDate <= nextDate,
      );
    }
  }
  // Last todos should be those without due dates
  for (
    let i = dueAscResult.data.length - todosWithoutDueDate.length;
    i < dueAscResult.data.length;
    i++
  ) {
    TestValidator.equals(
      `todo at index ${i} should have null due_date`,
      dueAscResult.data[i].due_date,
      null,
    );
  }
  // Test 6: Sorting by due date descending (latest first)
  const dueDescResult = await searchWithSort("due_date", "desc");
  TestValidator.equals(
    "should return all todos when sorting by due date descending",
    dueDescResult.data.length,
    todos.length,
  );
  // First todos should have due dates in descending order
  for (let i = 0; i < todosWithDueDate.length - 1; i++) {
    const current = dueDescResult.data[i];
    const next = dueDescResult.data[i + 1];
    if (current.due_date && next.due_date) {
      const currentDate = new Date(current.due_date).getTime();
      const nextDate = new Date(next.due_date).getTime();
      TestValidator.predicate(
        `todo at index ${i} should have later or equal due date than next todo with due date`,
        currentDate >= nextDate,
      );
    }
  }
  // Last todos should be those without due dates
  for (
    let i = dueDescResult.data.length - todosWithoutDueDate.length;
    i < dueDescResult.data.length;
    i++
  ) {
    TestValidator.equals(
      `todo at index ${i} should have null due_date`,
      dueDescResult.data[i].due_date,
      null,
    );
  }
}
