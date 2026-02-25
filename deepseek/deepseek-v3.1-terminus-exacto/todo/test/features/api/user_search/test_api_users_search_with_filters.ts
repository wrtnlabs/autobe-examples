import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_users_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Email exact match search
  const emailSearch = await api.functional.todoApp.users.index(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    } satisfies ITodoAppUser.IRequest,
  });
  typia.assert(emailSearch);
  TestValidator.equals(
    "email search returns pagination structure",
    typeof emailSearch.pagination,
    "object",
  );
  TestValidator.equals(
    "email search returns data array",
    Array.isArray(emailSearch.data),
    true,
  );
  // Test 2: Display name partial match search
  const displayNameSearch = await api.functional.todoApp.users.index(
    connection,
    {
      body: {
        display_name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 1,
          wordMax: 3,
        }),
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(displayNameSearch);
  TestValidator.predicate(
    "display name search has valid pagination",
    displayNameSearch.pagination.current >= 0 &&
      displayNameSearch.pagination.limit >= 0 &&
      displayNameSearch.pagination.records >= 0 &&
      displayNameSearch.pagination.pages >= 0,
  );
  // Test 3: Combined criteria with pagination
  const combinedSearch = await api.functional.todoApp.users.index(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(1),
      page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      limit: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
    } satisfies ITodoAppUser.IRequest,
  });
  typia.assert(combinedSearch);
  TestValidator.equals(
    "combined search has data",
    Array.isArray(combinedSearch.data),
    true,
  );
  // Validate user summary structure if data exists
  if (combinedSearch.data.length > 0) {
    const user = combinedSearch.data[0];
    TestValidator.predicate(
      "user has uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        user.id,
      ),
    );
    TestValidator.predicate(
      "user has email",
      typeof user.email === "string" && user.email.includes("@"),
    );
    TestValidator.predicate(
      "user has display_name",
      typeof user.display_name === "string",
    );
    TestValidator.predicate(
      "user has created_at",
      typeof user.created_at === "string" &&
        !isNaN(Date.parse(user.created_at)),
    );
  }
  // Test 4: Empty search (no filters)
  const emptySearch = await api.functional.todoApp.users.index(connection, {
    body: {} satisfies ITodoAppUser.IRequest,
  });
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search returns valid pagination",
    typeof emptySearch.pagination,
    "object",
  );
  TestValidator.equals(
    "empty search returns data array",
    Array.isArray(emptySearch.data),
    true,
  );
  // Test 5: Validate pagination metadata accuracy
  const paginationTest = await api.functional.todoApp.users.index(connection, {
    body: {
      page: 1,
      limit: 10,
    } satisfies ITodoAppUser.IRequest,
  });
  typia.assert(paginationTest);
  TestValidator.equals(
    "pagination current page matches request",
    paginationTest.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginationTest.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count is non-negative",
    paginationTest.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    paginationTest.pagination.pages >= 0,
  );
}
