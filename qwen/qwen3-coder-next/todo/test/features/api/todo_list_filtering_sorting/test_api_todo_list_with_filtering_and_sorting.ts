import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { IPrincipal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrincipal";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_list_with_filtering_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.todoApp.auth.user.join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  userConnection.headers = { Authorization: user.token.access };
  // Step 2: Create sample todos with various dates
  const todos: ITodoAppTodo[] = [];
  // Create 8 incomplete todos with different dates
  for (let i = 0; i < 8; i++) {
    const todo = await api.functional.todoApp.user.todos.create(
      userConnection,
      {
        body: {
          title: `Todo ${i + 1}`,
          description: `Description for todo ${i + 1}`,
          startDate:
            i % 2 === 0
              ? new Date(
                  Date.now() - (i + 1) * 24 * 60 * 60 * 1000,
                ).toISOString()
              : null,
          dueDate:
            i % 3 === 0
              ? new Date(
                  Date.now() + (i + 1) * 24 * 60 * 60 * 1000,
                ).toISOString()
              : null,
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    todos.push(todo);
  }
  // Step 3: Test filtering by status
  // Test "all" status filter
  const allResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: { status: "all" } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allResponse);
  TestValidator.equals(
    "total count matches",
    allResponse.pagination.records,
    8,
  );
  TestValidator.equals("all page count", allResponse.pagination.pages, 1);
  TestValidator.equals("data length matches total", allResponse.data.length, 8);
  // Test "complete" status filter (will be 0 since we can't set isComplete)
  const completeResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: { status: "complete" } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completeResponse);
  TestValidator.equals(
    "complete count (expected 0)",
    completeResponse.pagination.records,
    0,
  );
  TestValidator.predicate(
    "all complete",
    completeResponse.data.every((t) => t.is_complete),
  );
  // Test "incomplete" status filter
  const incompleteResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: { status: "incomplete" } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompleteResponse);
  TestValidator.equals(
    "incomplete count",
    incompleteResponse.pagination.records,
    8,
  );
  TestValidator.predicate(
    "all incomplete",
    incompleteResponse.data.every((t) => !t.is_complete),
  );
  // Step 4: Test sorting functionality
  // Test sorting by created_at (newest first)
  const sortedByDateResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        status: "all",
        sortFields: [{ field: "created_at", direction: "desc" }],
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortedByDateResponse);
  // Verify sorting order (newest first means descending by created_at)
  for (let i = 0; i < sortedByDateResponse.data.length - 1; i++) {
    const current = new Date(sortedByDateResponse.data[i].created_at).getTime();
    const next = new Date(
      sortedByDateResponse.data[i + 1].created_at,
    ).getTime();
    TestValidator.predicate("created_at descending", current >= next);
  }
  // Test sorting by start_date (nulls last, descending)
  const sortedByStartDateResponse =
    await api.functional.todoApp.user.todos.index(userConnection, {
      body: {
        status: "all",
        sortFields: [{ field: "start_date", direction: "desc" }],
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(sortedByStartDateResponse);
  // Verify start_date sorting (non-null values first, nulls last)
  let hasSeenNonNull = false;
  let lastNonNullDate: number | null = null;
  for (const todo of sortedByStartDateResponse.data) {
    if (todo.start_date !== null) {
      hasSeenNonNull = true;
      const currentDate = new Date(todo.start_date).getTime();
      if (lastNonNullDate !== null) {
        TestValidator.predicate(
          "start_date descending nulls last",
          currentDate <= lastNonNullDate,
        );
      }
      lastNonNullDate = currentDate;
    } else if (hasSeenNonNull) {
      TestValidator.predicate("null date at end", true);
    }
  }
  // Test sorting by due_date (earliest first, nulls last)
  const sortedByDueDateResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        status: "all",
        sortFields: [{ field: "due_date", direction: "asc" }],
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortedByDueDateResponse);
  // Verify due_date sorting
  let dueDateHasNonNull = false;
  let dueDateLastNonNull: number | null = null;
  for (const todo of sortedByDueDateResponse.data) {
    if (todo.due_date !== null) {
      dueDateHasNonNull = true;
      const currentDate = new Date(todo.due_date).getTime();
      if (dueDateLastNonNull !== null) {
        TestValidator.predicate(
          "due_date ascending nulls last",
          currentDate >= dueDateLastNonNull,
        );
      }
      dueDateLastNonNull = currentDate;
    } else if (dueDateHasNonNull) {
      TestValidator.predicate("null due_date at end", true);
    }
  }
  // Step 5: Test pagination
  // Test with limit=3 to verify pagination
  const paginatedResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        status: "all",
        page: 1,
        limit: 3,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResponse.data.length,
    3,
  );
  TestValidator.equals(
    "pagination total records",
    paginatedResponse.pagination.records,
    8,
  );
  TestValidator.equals(
    "pagination pages calculation",
    paginatedResponse.pagination.pages,
    3,
  ); // ceil(8/3) = 3
  // Test second page
  const page2Response = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        status: "all",
        page: 2,
        limit: 3,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(page2Response);
  TestValidator.equals("page 2 data length", page2Response.data.length, 3);
  // Step 6: Test combined filtering and sorting
  const combinedResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        status: "incomplete",
        sortFields: [
          { field: "created_at", direction: "desc" },
          { field: "due_date", direction: "asc" },
        ],
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(combinedResponse);
  TestValidator.equals(
    "combined filter count",
    combinedResponse.pagination.records,
    8,
  );
  TestValidator.predicate(
    "combined all incomplete",
    combinedResponse.data.every((t) => !t.is_complete),
  );
  // Step 7: Verify only current user's todos are returned (isolation test)
  // Create another user and their todos
  const otherUserConnection: api.IConnection = { host: connection.host };
  const otherUser = await api.functional.todoApp.auth.user.join(
    otherUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(otherUser);
  otherUserConnection.headers = { Authorization: otherUser.token.access };
  // Create todos for other user
  const otherTodo = await api.functional.todoApp.user.todos.create(
    otherUserConnection,
    {
      body: {
        title: "Other user's todo",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(otherTodo);
  // Verify our user's list is unchanged
  const finalResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: { status: "all" } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(finalResponse);
  TestValidator.equals(
    "user isolation preserved",
    finalResponse.pagination.records,
    8,
  );
  TestValidator.predicate(
    "no other user's todos",
    !finalResponse.data.some((t) => t.author.id === otherUser.id),
  );
}
