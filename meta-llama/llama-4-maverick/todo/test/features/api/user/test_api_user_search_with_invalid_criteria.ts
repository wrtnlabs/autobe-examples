import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_search_with_invalid_criteria(
  connection: api.IConnection,
) {
  // Authenticate user for search operation
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        name: RandomGenerator.name(),
        password: "1234",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Test with invalid search criteria - invalid status
  await TestValidator.error(
    "user search with invalid status should fail",
    async () =>
      await api.functional.todoList.user.users.index(connection, {
        body: {
          searchTerm: RandomGenerator.alphaNumeric(10),
          status: "invalid_status" as any,
        } satisfies ITodoListUser.IRequest,
      }),
  );

  // Test with invalid search criteria - empty search term
  await TestValidator.error(
    "user search with empty search term should fail",
    async () =>
      await api.functional.todoList.user.users.index(connection, {
        body: {
          searchTerm: "",
          status: "active",
        } satisfies ITodoListUser.IRequest,
      }),
  );

  // Test with invalid search criteria - special characters in search term
  await TestValidator.error(
    "user search with special characters should fail",
    async () =>
      await api.functional.todoList.user.users.index(connection, {
        body: {
          searchTerm: "@#$%^&*()",
          status: "active",
        } satisfies ITodoListUser.IRequest,
      }),
  );
}
