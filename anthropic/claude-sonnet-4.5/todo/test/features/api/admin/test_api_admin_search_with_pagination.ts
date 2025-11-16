import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdmin";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test administrator search functionality with pagination controls.
 *
 * This test validates that administrators can search and browse through
 * multiple pages of admin accounts using page number and limit parameters. It
 * verifies correct pagination metadata (current page, total records, total
 * pages, limit) and ensures that the returned admin summaries contain expected
 * fields.
 *
 * Test workflow:
 *
 * 1. Create and authenticate as initial administrator
 * 2. Create multiple test administrator accounts for pagination testing
 * 3. Test pagination with default parameters (page 1)
 * 4. Test pagination with custom page size (limit parameter)
 * 5. Test pagination with different page numbers
 * 6. Validate pagination metadata correctness
 * 7. Verify admin summary structure in response data
 */
export async function test_api_admin_search_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as initial administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create multiple test administrator accounts for pagination testing
  const testAdminCount = 15;
  const testAdmins = await ArrayUtil.asyncRepeat(
    testAdminCount,
    async (index) => {
      const testEmail = typia.random<string & tags.Format<"email">>();
      const testPassword = typia.random<string & tags.MinLength<8>>();

      const testAdmin = await api.functional.auth.admin.join(connection, {
        body: {
          email: testEmail,
          password: testPassword,
          ip: "127.0.0.1",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoListAdmin.ICreate,
      });
      typia.assert(testAdmin);
      return testAdmin;
    },
  );

  // Step 3: Test pagination with default parameters (page 1)
  const firstPage = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(firstPage);

  // Step 4: Validate first page response structure
  TestValidator.equals(
    "first page current should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should be 10",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records should be at least test admin count plus original admin",
    firstPage.pagination.records >= testAdminCount + 1,
  );
  TestValidator.predicate(
    "data array should not exceed limit",
    firstPage.data.length <= 10,
  );

  // Step 5: Test pagination with different page size
  const smallPage = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(smallPage);

  TestValidator.equals(
    "small page limit should be 5",
    smallPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "small page data should not exceed 5 items",
    smallPage.data.length <= 5,
  );

  // Step 6: Test pagination with page 2
  if (firstPage.pagination.pages >= 2) {
    const secondPage = await api.functional.todoList.admin.admins.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies ITodoListAdmin.IRequest,
      },
    );
    typia.assert(secondPage);

    TestValidator.equals(
      "second page current should be 2",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "total records should match across pages",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
  }

  // Step 7: Verify admin summary structure in response data
  if (firstPage.data.length > 0) {
    const adminSummary = firstPage.data[0];
    typia.assert<ITodoListAdmin.ISummary>(adminSummary);
  }

  // Step 8: Test with maximum limit
  const maxLimitPage = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(maxLimitPage);

  TestValidator.equals(
    "max limit page should have limit 100",
    maxLimitPage.pagination.limit,
    100,
  );

  // Step 9: Verify pagination calculations
  const expectedPages = Math.ceil(
    firstPage.pagination.records / firstPage.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation should be correct",
    firstPage.pagination.pages,
    expectedPages,
  );
}
