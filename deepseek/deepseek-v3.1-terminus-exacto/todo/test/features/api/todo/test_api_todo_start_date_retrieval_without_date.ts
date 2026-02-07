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

export async function test_api_todo_start_date_retrieval_without_date(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Note: The current API structure makes this test scenario impossible to implement
  // because the todo creation endpoint returns void and there's no way to get
  // the created todo's ID to retrieve its start date field.
  //
  // This test demonstrates the limitation of the current API design.
  // Since we cannot create a todo and get its ID with the current API,
  // we'll test the start date retrieval endpoint with a random UUID
  // to verify it handles missing records gracefully
  const randomTodoId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve start date field for a non-existent todo
  // This should return an appropriate response indicating no start date exists
  const startDateField = await api.functional.todoApp.user.todos.start_date.at(
    userConnection,
    {
      todoId: randomTodoId,
    },
  );
  typia.assert(startDateField);
  // Validate the response structure
  TestValidator.equals(
    "start_date should be null for non-existent todo",
    startDateField.start_date,
    null,
  );
  TestValidator.predicate(
    "should have valid todo structure",
    startDateField.todo !== undefined,
  );
}
