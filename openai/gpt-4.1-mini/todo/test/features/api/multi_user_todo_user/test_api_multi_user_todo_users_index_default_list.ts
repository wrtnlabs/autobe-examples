import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_multi_user_todo_users_index_default_list(
  connection: api.IConnection,
): Promise<void> {
  // Use base connection to create an actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Prepare the request body with no filters or sorting as per scenario
  const body: IMultiUserTodoUser.IRequest = {};
  // Perform the patch request to fetch users index
  const response = await api.functional.multiUserTodo.users.index(
    userConnection,
    { body },
  );
  typia.assert(response);
  // Validate that pagination properties exist with correct constraints
  const { pagination, data } = response;
  // Pagination is valid and contains the expected properties
  TestValidator.predicate(
    "pagination current page number should be greater or equal to 0",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be greater or equal to 0",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count should be greater or equal to 0",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count should be greater or equal to 0",
    pagination.pages >= 0,
  );
  // Validate that data is an array
  TestValidator.predicate("data is array", Array.isArray(data));
  // Each user summary in data should not contain sensitive fields like password hashes
  // Since the ISummary type is empty in DTO definition, we cannot check specific properties,
  // but we ensure each entry is an object.
  for (const userSummary of data) {
    TestValidator.predicate(
      "each data item is an object",
      typeof userSummary === "object" && userSummary !== null,
    );
  }
}
