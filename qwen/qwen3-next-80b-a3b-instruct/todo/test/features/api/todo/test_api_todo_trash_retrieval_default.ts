import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
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

export async function test_api_todo_trash_retrieval_default(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {} satisfies ITodoAppUser.IJoin,
  });
  // Retrieve trash list with default parameters (empty request body)
  const trashResponse = await api.functional.todoApp.user.trash.index(
    userConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashResponse);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination.current is int32",
    typeof trashResponse.pagination.current === "number" &&
      Number.isInteger(trashResponse.pagination.current) &&
      trashResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is int32",
    typeof trashResponse.pagination.limit === "number" &&
      Number.isInteger(trashResponse.pagination.limit) &&
      trashResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is int32",
    typeof trashResponse.pagination.records === "number" &&
      Number.isInteger(trashResponse.pagination.records) &&
      trashResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is int32",
    typeof trashResponse.pagination.pages === "number" &&
      Number.isInteger(trashResponse.pagination.pages) &&
      trashResponse.pagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.predicate("data is array", Array.isArray(trashResponse.data));
  // Validate each summary item structure - ITodoAppTodo.ISummary is defined as empty object {}
  // The schema explicitly states that the summary does not contain any properties
  // This is a privacy feature to prevent exposure of user data
  // Therefore, no property validation is possible or allowed - the object must be empty
  for (const todo of trashResponse.data) {
    // Confirm the object is validated and type-safe
    typia.assert<ITodoAppTodo.ISummary>(todo);
    // Since ITodoAppTodo.ISummary is defined as {} with no properties,
    // we cannot validate any properties like title, completed, created_at, etc.
    // The specification requires that summaries are empty objects
    // Any attempt to access properties would violate the API contract
    // Therefore, no validation of properties is performed
    // The only validation we can perform is that the object is not null/undefined
    // and is of the correct type, which is already covered by typia.assert
  }
}
