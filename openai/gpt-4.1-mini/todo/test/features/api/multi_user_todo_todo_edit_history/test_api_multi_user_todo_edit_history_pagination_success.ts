import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_multi_user_todo_user_todos_create } from "../../../generate/generate_random_multi_user_todo_user_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_multi_user_todo_edit_history_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinBody: IMultiUserTodoUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    displayName: RandomGenerator.name(),
    href: "http://example.com/join",
    referrer: "http://example.com/referrer",
    ip: null,
  };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: userJoinBody,
  });
  // Update userConnection headers with authorization token
  userConnection.headers = {
    Authorization: authorizedUser.token.access,
  };
  // 2. Create a new todo item
  const todo = await generate_random_multi_user_todo_user_todos_create(
    userConnection,
    {},
  );
  typia.assert(todo);
  // 3. Retrieve edit histories for the todo with default pagination and sorting
  const requestBody: IMultiUserTodoTodoEditHistory.IRequest = {
    page: 1,
    limit: 10,
    sortBy: "created_at",
    sortOrder: "desc",
    startDate: null,
    endDate: null,
    search: null,
  };
  let response =
    await api.functional.multiUserTodo.user.todos.editHistories.index(
      userConnection,
      {
        todoId: todo.id,
        body: requestBody,
      },
    );
  typia.assert(response);
  // 4. Validate empty edit history list for a new todo (no edits yet)
  TestValidator.equals(
    "edit history list should be empty",
    response.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit > 0,
  );
  // 5. Re-query edit histories with same request - expect still empty or sorted list
  response = await api.functional.multiUserTodo.user.todos.editHistories.index(
    userConnection,
    {
      todoId: todo.id,
      body: requestBody,
    },
  );
  typia.assert(response);
  // 6. Validate each edit history entry fields if any exist
  for (let i = 0; i < response.data.length; ++i) {
    const entry = response.data[i];
    if (entry.changedTitle !== null && entry.changedTitle !== undefined) {
      TestValidator.predicate(
        "changedTitle is string",
        typeof entry.changedTitle === "string",
      );
    } else {
      TestValidator.equals("changedTitle is null", entry.changedTitle, null);
    }
    if (
      entry.changedDescription !== null &&
      entry.changedDescription !== undefined
    ) {
      TestValidator.predicate(
        "changedDescription is string",
        typeof entry.changedDescription === "string",
      );
    } else {
      TestValidator.equals(
        "changedDescription is null",
        entry.changedDescription,
        null,
      );
    }
    if (
      entry.changedStartDate !== null &&
      entry.changedStartDate !== undefined
    ) {
      TestValidator.predicate(
        "changedStartDate is string",
        typeof entry.changedStartDate === "string",
      );
    } else {
      TestValidator.equals(
        "changedStartDate is null",
        entry.changedStartDate,
        null,
      );
    }
    if (entry.changedDueDate !== null && entry.changedDueDate !== undefined) {
      TestValidator.predicate(
        "changedDueDate is string",
        typeof entry.changedDueDate === "string",
      );
    } else {
      TestValidator.equals(
        "changedDueDate is null",
        entry.changedDueDate,
        null,
      );
    }
    TestValidator.predicate(
      "createdAt is string",
      typeof entry.createdAt === "string",
    );
    TestValidator.predicate(
      "updatedAt is string",
      typeof entry.updatedAt === "string",
    );
    if (entry.deletedAt !== undefined) {
      if (entry.deletedAt !== null) {
        TestValidator.predicate(
          "deletedAt is string",
          typeof entry.deletedAt === "string",
        );
      } else {
        TestValidator.equals("deletedAt is null", entry.deletedAt, null);
      }
    }
    // Validate todoId matches
    TestValidator.equals("edit history todoId matches", entry.todoId, todo.id);
  }
  // 7. Validate sorted by createdAt descending if data available
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; ++i) {
      const currentDate = new Date(response.data[i].createdAt);
      const nextDate = new Date(response.data[i + 1].createdAt);
      TestValidator.predicate(
        `edit history sorted desc at index ${i}`,
        currentDate >= nextDate,
      );
    }
  }
}
