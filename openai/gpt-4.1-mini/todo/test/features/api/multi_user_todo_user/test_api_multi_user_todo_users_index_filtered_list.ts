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

export async function test_api_multi_user_todo_users_index_filtered_list(
  connection: api.IConnection,
): Promise<void> {
  // Call the users index endpoint with empty filter to retrieve paginated user list
  const requestBody: IMultiUserTodoUser.IRequest = {};
  const response = await api.functional.multiUserTodo.users.index(connection, {
    body: requestBody,
  });
  typia.assert(response);
  // Validate pagination properties exist and have expected types
  TestValidator.predicate(
    "pagination current page is number",
    typeof response.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit is number",
    typeof response.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records is number",
    typeof response.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof response.pagination.pages === "number",
  );
  // Validate data is array
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // Since no user properties are defined, no further property validation is possible
}
