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

export async function test_api_multi_user_todo_users_index_sorted_list(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for multiUserTodo users index
  const multiUserTodoConnection: api.IConnection = { host: connection.host };
  // Request user list with empty filter object since IRequest has no defined fields
  const body: IMultiUserTodoUser.IRequest = {};
  // Call the API
  const output: IPageIMultiUserTodoUser.ISummary =
    await api.functional.multiUserTodo.users.index(multiUserTodoConnection, {
      body,
    });
  // Assert output correctness with typia.assert
  typia.assert(output);
  // Validate pagination properties
  const pagination = output.pagination;
  TestValidator.predicate(
    "pagination current page is positive",
    pagination.current > 0,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  // Check data length does not exceed limit
  TestValidator.predicate(
    "data length does not exceed page limit",
    output.data.length <= pagination.limit,
  );
  // Confirm data is an array
  TestValidator.predicate("data is an array", Array.isArray(output.data));
}
