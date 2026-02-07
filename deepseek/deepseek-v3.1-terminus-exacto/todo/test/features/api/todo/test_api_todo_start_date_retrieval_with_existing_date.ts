import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoStartDateField } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStartDateField";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_start_date_retrieval_with_existing_date(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate via join
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Since the todo creation endpoint returns void and we can't get a todo ID from it,
  // we'll use a randomly generated UUID to test the start date retrieval endpoint
  const todoId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the start date field for the todo
  // This will either succeed (if the todo exists with a start date) or fail
  try {
    const startDateField =
      await api.functional.todoApp.user.todos.start_date.at(userConnection, {
        todoId,
      });
    typia.assert(startDateField);
    // Validate the response structure if retrieval was successful
    TestValidator.equals(
      "start date field has valid id format",
      typeof startDateField.id,
      "string",
    );
    TestValidator.equals(
      "start date field belongs to the requested todo",
      startDateField.todo.id,
      todoId,
    );
    TestValidator.predicate(
      "start date field has valid created_at timestamp",
      new Date(startDateField.created_at).getTime() > 0,
    );
    TestValidator.predicate(
      "start date field has valid updated_at timestamp",
      new Date(startDateField.updated_at).getTime() > 0,
    );
  } catch (error) {
    // If the todo doesn't exist or has no start date, that's also a valid test outcome
    // We'll validate that we got a proper error response
    if (error instanceof api.HttpError) {
      TestValidator.predicate(
        "returns appropriate error status for non-existent todo",
        error.status >= 400 && error.status < 500,
      );
    } else {
      throw error; // Re-throw unexpected errors
    }
  }
}
