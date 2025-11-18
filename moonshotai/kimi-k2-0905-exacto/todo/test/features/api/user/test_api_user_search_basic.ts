import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_search_basic(connection: api.IConnection) {
  // Create test users to have data to search through
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user1);

  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user2);

  const user3 = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user3);

  // Perform basic search with default parameters
  const searchResult = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppUser.IRequest,
    },
  );

  // Validate pagination metadata exists and is correct
  typia.assert(searchResult);
  TestValidator.predicate(
    "pagination object exists",
    searchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(searchResult.data),
  );
  TestValidator.predicate(
    "pagination current page >= 0",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    searchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    searchResult.pagination.pages >= 0,
  );
}
