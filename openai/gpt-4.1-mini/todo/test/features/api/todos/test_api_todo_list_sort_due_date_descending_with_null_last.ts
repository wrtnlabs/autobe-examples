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

export async function test_api_todo_list_sort_due_date_descending_with_null_last(
  connection: api.IConnection,
): Promise<void> {
  // 1. User joins (authenticates)
  const userConnection: api.IConnection = { host: connection.host };
  // Use authorize_user_join utility function with random join data
  const authorized = await authorize_user_join(userConnection, {
    body: typia.random<IMultiUserTodoUser.IJoin>(),
  });
  // Update userConnection headers with the token
  userConnection.headers ??= {};
  userConnection.headers.Authorization = authorized.token.access;
  // 2. Prepare test todos with mixed due dates (some null, some valid)
  // As the scenario focuses on listing todos sorted by due date descending,
  // we create several todos where some have null due dates and others have explicit dates.
  // For this, we first create todos with varying due dates via raw API calls or utility
  // functions if available. Since no utility to create todos was specified,
  // let's generate todo creation requests via sdk.
  // NOTE: IMultiUserTodoTodo.IRequest and ISummary types were empty in definitions,
  // so we assume the actual todo creation API is not exposed here.
  // Therefore, we'll proceed to only test the index endpoint's behavior in listing.
  // However, without todo creation, the list might be empty.
  // We rely on the random data the API can have from previous tests or seed data.
  // 3. Request todo list sorted by due date descending.
  const body: IMultiUserTodoTodo.IRequest = {
    // Interface is empty, so the actual properties are unspecified in DTO.
    // But scenario states: filtering, pagination, sorting should apply.
    // We construct the body with sorting parameters according to the description.
    // Since DTO is empty, we just send an empty object.
  };
  // Make the API call
  const output = await api.functional.multiUserTodo.user.todos.index(
    userConnection,
    {
      body: body,
    },
  );
  typia.assert(output);
  // 4. Validate output
  // Since the ISummary type is empty, we cannot access specific properties.
  // But per scenario, we must confirm ordering by due date descending,
  // including that todos with null due date come last.
  // So, we access output.data as todos
  // We treat dueDate as nullable date string | null
  const todos = output.data as Array<{
    due_date: string | null;
  }>;
  // Pagination metadata checks
  TestValidator.predicate(
    "pagination current page >= 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    output.pagination.records >= 0,
  );
  // Validate ordering: due date descending, nulls last
  for (let i = 1; i < todos.length; ++i) {
    const prev = todos[i - 1].due_date;
    const curr = todos[i].due_date;
    if (prev === null && curr !== null) {
      throw new Error("Todos with null due date should come last");
    }
    if (prev !== null && curr !== null) {
      TestValidator.predicate("due date descending order", prev >= curr);
    }
  }
}
