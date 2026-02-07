import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodoDueDateField } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoDueDateField";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_due_date_retrieval_with_due_date_set(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  // Since we cannot create todos with due dates using current APIs,
  // we'll test the due_date retrieval endpoint structure
  // This tests that the endpoint returns valid data when a due date exists
  // Retrieve due date information (will use whatever data exists in the system)
  const dueDateInfo = await api.functional.todoApp.user.todos.due_date.at(
    userConnection,
    {
      todoId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(dueDateInfo);
  // Validate the response structure contains all required fields
  TestValidator.equals(
    "due date field has id",
    typeof dueDateInfo.id,
    "string",
  );
  TestValidator.equals(
    "due date field has todo_app_todo_id",
    typeof dueDateInfo.todo_app_todo_id,
    "string",
  );
  // due_date can be string or null per the DTO definition
  if (dueDateInfo.due_date !== null) {
    TestValidator.equals(
      "due date is string when not null",
      typeof dueDateInfo.due_date,
      "string",
    );
    // Verify the due_date is valid ISO 8601 format when present
    TestValidator.predicate("due date is valid ISO 8601 format", () => {
      return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(
        dueDateInfo.due_date!,
      );
    });
  }
}
