import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdmin";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test administrator search with multiple filter criteria applied
 * simultaneously.
 *
 * This test validates that the admin search API correctly handles complex
 * queries where email filtering, search terms, sorting, and pagination are
 * combined. It ensures all parameters work harmoniously without conflicts and
 * produce accurate, filtered, sorted, and paginated results.
 *
 * Test workflow:
 *
 * 1. Authenticate as administrator
 * 2. Create diverse test admin accounts with various email patterns
 * 3. Test email filter + search term combination
 * 4. Test email filter + sorting combinations
 * 5. Test email filter + pagination
 * 6. Test all filters combined (email + search + sort + pagination)
 * 7. Validate result accuracy, sorting order, and pagination metadata
 */
export async function test_api_admin_search_multiple_filters_combined(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const mainAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      ip: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(mainAdmin);

  // Step 2: Create diverse test admin accounts
  const testDomains = ["company.com", "test.org", "example.net"] as const;
  const testPrefixes = ["admin", "test", "user", "manager", "support"] as const;

  const createdAdmins: ITodoListAdmin.IAuthorized[] = [];

  // Create 15 test admins with various patterns
  for (let i = 0; i < 15; i++) {
    const domain = RandomGenerator.pick(testDomains);
    const prefix = RandomGenerator.pick(testPrefixes);
    const uniqueId = RandomGenerator.alphaNumeric(6);
    const email = `${prefix}${uniqueId}@${domain}`;

    const admin = await api.functional.auth.admin.join(connection, {
      body: {
        email: email,
        password: typia.random<string & tags.MinLength<8>>(),
        ip: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
    typia.assert(admin);
    createdAdmins.push(admin);

    // Small delay to ensure different created_at timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  // Step 3: Test email filter + search term combination
  const companyDomain = "company.com";
  const searchTerm = "admin";

  const emailAndSearchResult = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        email: companyDomain,
        search: searchTerm,
        page: 1,
        limit: 10,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(emailAndSearchResult);

  // Validate: All results should match both email and search criteria
  for (const admin of emailAndSearchResult.data) {
    TestValidator.predicate(
      "admin email contains email filter",
      admin.email.includes(companyDomain),
    );
    TestValidator.predicate(
      "admin email contains search term",
      admin.email.includes(searchTerm),
    );
  }

  // Step 4: Test email filter + sorting (descending - newest first)
  const sortedDescResult = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        email: "test.org",
        sort: "-created_at",
        page: 1,
        limit: 20,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(sortedDescResult);

  // Validate: Results should be sorted by created_at descending (only if 2+ items)
  if (sortedDescResult.data.length >= 2) {
    for (let i = 0; i < sortedDescResult.data.length - 1; i++) {
      const current = new Date(sortedDescResult.data[i].created_at).getTime();
      const next = new Date(sortedDescResult.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "admins sorted by created_at descending",
        current >= next,
      );
    }
  }

  // Step 5: Test email filter + sorting (ascending - oldest first)
  const sortedAscResult = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        email: "example.net",
        sort: "created_at",
        page: 1,
        limit: 20,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(sortedAscResult);

  // Validate: Results should be sorted by created_at ascending (only if 2+ items)
  if (sortedAscResult.data.length >= 2) {
    for (let i = 0; i < sortedAscResult.data.length - 1; i++) {
      const current = new Date(sortedAscResult.data[i].created_at).getTime();
      const next = new Date(sortedAscResult.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "admins sorted by created_at ascending",
        current <= next,
      );
    }
  }

  // Step 6: Test pagination with filters
  const page1Result = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        search: "test",
        page: 1,
        limit: 5,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(page1Result);

  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", page1Result.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records is non-negative",
    page1Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    page1Result.pagination.pages ===
      Math.ceil(page1Result.pagination.records / page1Result.pagination.limit),
  );

  // Validate data length
  if (page1Result.pagination.records > 5) {
    TestValidator.equals(
      "page 1 has full limit of items",
      page1Result.data.length,
      5,
    );
  } else {
    TestValidator.equals(
      "page 1 has remaining items",
      page1Result.data.length,
      page1Result.pagination.records,
    );
  }

  // Step 7: Test all filters combined (email + search + sort + pagination)
  const combinedResult = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        email: "com",
        search: "user",
        sort: "-created_at",
        page: 1,
        limit: 3,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(combinedResult);

  // Validate: All filters applied correctly
  for (const admin of combinedResult.data) {
    TestValidator.predicate(
      "combined filter: email contains 'com'",
      admin.email.includes("com"),
    );
    TestValidator.predicate(
      "combined filter: email contains search term 'user'",
      admin.email.includes("user"),
    );
  }

  // Validate: Sorting is correct (only if 2+ items)
  if (combinedResult.data.length >= 2) {
    for (let i = 0; i < combinedResult.data.length - 1; i++) {
      const current = new Date(combinedResult.data[i].created_at).getTime();
      const next = new Date(combinedResult.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "combined filter: sorted by created_at descending",
        current >= next,
      );
    }
  }

  // Validate: Pagination metadata
  TestValidator.equals(
    "combined filter: current page",
    combinedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter: limit",
    combinedResult.pagination.limit,
    3,
  );
  TestValidator.predicate(
    "combined filter: data length within limit",
    combinedResult.data.length <= 3,
  );

  // Step 8: Test edge case - filters that match nothing
  const emptyResult = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        email: "nonexistent-domain-12345.xyz",
        search: "impossible-pattern-99999",
        page: 1,
        limit: 10,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(emptyResult);

  TestValidator.equals(
    "empty result: no records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result: no pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result: empty data array",
    emptyResult.data.length,
    0,
  );

  // Step 9: Test pagination across multiple pages
  if (page1Result.pagination.pages > 1) {
    const page2Result = await api.functional.todoList.admin.admins.index(
      connection,
      {
        body: {
          search: "test",
          page: 2,
          limit: 5,
        } satisfies ITodoListAdmin.IRequest,
      },
    );
    typia.assert(page2Result);

    TestValidator.equals(
      "page 2: current page",
      page2Result.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2: same total records",
      page2Result.pagination.records,
      page1Result.pagination.records,
    );

    // Verify no duplicates between page 1 and page 2
    const page1Ids = page1Result.data.map((admin) => admin.id);
    const page2Ids = page2Result.data.map((admin) => admin.id);

    for (const id of page2Ids) {
      TestValidator.predicate(
        "no duplicate IDs across pages",
        !page1Ids.includes(id),
      );
    }
  }
}
