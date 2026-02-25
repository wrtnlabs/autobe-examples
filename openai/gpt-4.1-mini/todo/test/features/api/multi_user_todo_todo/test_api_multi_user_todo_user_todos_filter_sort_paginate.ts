import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_multi_user_todo_user_todos_filter_sort_paginate(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Retrieve paginated todos for authenticated user with filter, sort, and pagination.
  // Authenticate user via join
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPassword123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://referrer.com",
      ip: null,
    } satisfies IMultiUserTodoUser.IJoin,
  });
  typia.assert(authorized);
  // Create a connection with user authorization token
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.access },
  };
  // Scenario 1: paginated list, completionStatus='all', sortBy='creationDate', asc, page=1, pageSize=20
  {
    const body = {
      completionStatus: "all",
      sortBy: "creationDate",
      sortOrder: "asc",
      page: 1,
      pageSize: 20,
    } satisfies IMultiUserTodoTodo.IRequest;
    const output = await api.functional.multiUserTodo.user.todos.index(
      userConnection,
      { body },
    );
    typia.assert(output);
    // All todos belong to authenticated user
    for (const todo of output.data) {
      TestValidator.equals("todo belongs to user", todo.user.id, authorized.id);
    }
    // Pagination metadata verification
    TestValidator.predicate(
      "pagination current page",
      output.pagination.current === 1,
    );
    TestValidator.predicate(
      "pagination limit count",
      output.pagination.limit === 20,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      output.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records >= data.length",
      output.pagination.records >= output.data.length,
    );
    TestValidator.predicate(
      "pagination data length <= limit",
      output.data.length <= output.pagination.limit,
    );
  }
  // Scenario 2: filter complete todos, sortBy dueDate desc, page 1, pageSize 10
  {
    const body = {
      completionStatus: "complete",
      sortBy: "dueDate",
      sortOrder: "desc",
      page: 1,
      pageSize: 10,
    } satisfies IMultiUserTodoTodo.IRequest;
    const output = await api.functional.multiUserTodo.user.todos.index(
      userConnection,
      { body },
    );
    typia.assert(output);
    // All todos completed
    for (const todo of output.data) {
      TestValidator.predicate("todo completed", todo.completed === true);
    }
    // Verify dueDate descending order; null or undefined dueDate treated as last
    for (let i = 0; i < output.data.length - 1; i++) {
      const current = output.data[i].dueDate;
      const next = output.data[i + 1].dueDate;
      if (current === null || current === undefined) {
        // current is last or equal, so next should also be null or undefined
        TestValidator.predicate(
          "dueDate descending order with nulls",
          next === null || next === undefined,
        );
      } else if (next !== null && next !== undefined) {
        TestValidator.predicate("dueDate descending order", current >= next);
      }
    }
    // Pagination check
    TestValidator.predicate(
      "pagination current page",
      output.pagination.current === 1,
    );
    TestValidator.predicate(
      "pagination limit count",
      output.pagination.limit === 10,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      output.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records >= data length",
      output.pagination.records >= output.data.length,
    );
    TestValidator.predicate(
      "pagination data length <= limit",
      output.data.length <= output.pagination.limit,
    );
  }
  // Scenario 3: filter incomplete todos, sortBy startDate asc, page 2, pageSize 15
  {
    const body = {
      completionStatus: "incomplete",
      sortBy: "startDate",
      sortOrder: "asc",
      page: 2,
      pageSize: 15,
    } satisfies IMultiUserTodoTodo.IRequest;
    const output = await api.functional.multiUserTodo.user.todos.index(
      userConnection,
      { body },
    );
    typia.assert(output);
    // All todos incomplete
    for (const todo of output.data) {
      TestValidator.predicate("todo incomplete", todo.completed === false);
    }
    // Verify ascending order by startDate; null or undefined startDate at last
    for (let i = 0; i < output.data.length - 1; i++) {
      const current = output.data[i].startDate;
      const next = output.data[i + 1].startDate;
      if (current === null || current === undefined) {
        // current is last or equal, so next should also be null or undefined
        TestValidator.predicate(
          "startDate ascending order with nulls",
          next === null || next === undefined,
        );
      } else if (next !== null && next !== undefined) {
        TestValidator.predicate("startDate ascending order", current <= next);
      }
    }
    // Pagination metadata validation
    TestValidator.predicate(
      "pagination current page",
      output.pagination.current === 2,
    );
    TestValidator.predicate(
      "pagination limit count",
      output.pagination.limit === 15,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      output.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records >= data.length",
      output.pagination.records >= output.data.length,
    );
    TestValidator.predicate(
      "pagination data length <= limit",
      output.data.length <= output.pagination.limit,
    );
  }
}
