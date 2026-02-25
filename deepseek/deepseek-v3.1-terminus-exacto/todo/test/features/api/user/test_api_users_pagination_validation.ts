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

export async function test_api_users_pagination_validation(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic pagination with page=1, limit=10
  const page1Response = await api.functional.todoApp.users.index(connection, {
    body: {
      page: 1 satisfies number as number,
      limit: 10 satisfies number as number,
    } satisfies ITodoAppUser.IRequest,
  });
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 records non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages non-negative",
    page1Response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length <= limit",
    page1Response.data.length <= 10,
  );
  // Test 2: Second page with page=2, limit=5
  const page2Response = await api.functional.todoApp.users.index(connection, {
    body: {
      page: 2 satisfies number as number,
      limit: 5 satisfies number as number,
    } satisfies ITodoAppUser.IRequest,
  });
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 5);
  // Test 3: Edge case - minimum limit (1)
  const minLimitResponse = await api.functional.todoApp.users.index(
    connection,
    {
      body: {
        page: 1 satisfies number as number,
        limit: 1 satisfies number as number,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "min limit current page",
    minLimitResponse.pagination.current,
    1,
  );
  TestValidator.equals("min limit limit", minLimitResponse.pagination.limit, 1);
  TestValidator.predicate(
    "data length <= 1",
    minLimitResponse.data.length <= 1,
  );
  // Test 4: Edge case - maximum limit (100)
  const maxLimitResponse = await api.functional.todoApp.users.index(
    connection,
    {
      body: {
        page: 1 satisfies number as number,
        limit: 100 satisfies number as number,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit current page",
    maxLimitResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "max limit limit",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data length <= 100",
    maxLimitResponse.data.length <= 100,
  );
  // Test 5: Validate pagination calculations
  if (
    page1Response.pagination.records > 0 &&
    page1Response.pagination.limit > 0
  ) {
    const expectedPages = Math.ceil(
      page1Response.pagination.records / page1Response.pagination.limit,
    );
    TestValidator.equals(
      "page count calculation",
      page1Response.pagination.pages,
      expectedPages,
    );
  }
  // Test 6: Validate data isolation - ensure user data integrity
  // Check that all returned users have valid UUIDs and emails
  for (const user of page1Response.data) {
    typia.assert(user);
    TestValidator.predicate(
      "user has UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        user.id,
      ),
    );
    TestValidator.predicate("user has email", user.email.includes("@"));
    TestValidator.predicate(
      "user has display name",
      user.display_name.length > 0,
    );
    TestValidator.predicate(
      "user has created_at ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(user.created_at),
    );
  }
  // Test 7: Sorting consistency across pages
  if (page1Response.data.length > 0 && page2Response.data.length > 0) {
    // Assuming sorting by created_at descending, verify no overlap
    const page1LastCreated =
      page1Response.data[page1Response.data.length - 1].created_at;
    const page2FirstCreated = page2Response.data[0].created_at;
    // In consistent sorting, page1 items should be "before" page2 items
    TestValidator.predicate(
      "sorting consistency",
      page1LastCreated >= page2FirstCreated,
    );
  }
  // Test 8: Empty results with specific search criteria
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const emptyResponse = await api.functional.todoApp.users.index(connection, {
    body: {
      email: nonExistentEmail satisfies string &
        tags.Format<"email"> as string & tags.Format<"email">,
      page: 1 satisfies number as number,
      limit: 10 satisfies number as number,
    } satisfies ITodoAppUser.IRequest,
  });
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty response data length",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty response records",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty response pages",
    emptyResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty response current page",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty response limit",
    emptyResponse.pagination.limit,
    10,
  );
  // Test 9: Search by display name pattern
  const randomName = RandomGenerator.name();
  const searchResponse = await api.functional.todoApp.users.index(connection, {
    body: {
      display_name: randomName satisfies string as string,
      page: 1 satisfies number as number,
      limit: 10 satisfies number as number,
    } satisfies ITodoAppUser.IRequest,
  });
  typia.assert(searchResponse);
  // Validate pagination metadata even for search results
  TestValidator.predicate(
    "search records non-negative",
    searchResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "search pages non-negative",
    searchResponse.pagination.pages >= 0,
  );
}
