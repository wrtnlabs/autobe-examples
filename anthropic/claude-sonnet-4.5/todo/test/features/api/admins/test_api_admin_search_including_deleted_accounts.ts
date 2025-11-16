import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdmin";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test administrator search results to verify soft-deleted account handling.
 *
 * This test validates the soft-delete pattern implementation by creating
 * multiple administrator accounts and then searching for them to verify that
 * the deleted_at field is properly included in search results. The test ensures
 * that:
 *
 * 1. Multiple admin accounts can be created successfully
 * 2. The search API returns paginated results with admin summaries
 * 3. The ITodoListAdmin.ISummary type correctly includes the deleted_at field
 * 4. The deleted_at field can be null (for active accounts) or a timestamp (for
 *    deleted accounts)
 * 5. Search results properly expose deletion status for audit trail purposes
 *
 * Since no explicit delete endpoint is available in the provided API functions,
 * this test focuses on verifying that the search API structure correctly
 * supports the soft-delete pattern by including the deleted_at field in
 * response data.
 */
export async function test_api_admin_search_including_deleted_accounts(
  connection: api.IConnection,
) {
  // Create first admin account and authenticate
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1 = await api.functional.auth.admin.join(connection, {
    body: {
      email: admin1Email,
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin1);

  // Create additional admin accounts to populate the search results
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2 = await api.functional.auth.admin.join(connection, {
    body: {
      email: admin2Email,
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin2);

  const admin3Email = typia.random<string & tags.Format<"email">>();
  const admin3 = await api.functional.auth.admin.join(connection, {
    body: {
      email: admin3Email,
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin3);

  // Search for all admin accounts with pagination
  const searchResults = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(searchResults);

  // Verify pagination structure
  TestValidator.predicate(
    "search results should have pagination",
    searchResults.pagination !== null && searchResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "search results should have data array",
    Array.isArray(searchResults.data),
  );
  TestValidator.predicate(
    "search results should contain at least the created admins",
    searchResults.data.length >= 3,
  );

  // Verify that all returned admin summaries include the deleted_at field
  const createdAdminIds = [admin1.id, admin2.id, admin3.id];
  const foundAdmins = searchResults.data.filter((admin) =>
    createdAdminIds.includes(admin.id),
  );

  TestValidator.predicate(
    "all created admins should be found in search results",
    foundAdmins.length === 3,
  );

  // Verify each found admin has the deleted_at field (should be null for newly created accounts)
  for (const admin of foundAdmins) {
    TestValidator.predicate(
      "admin summary should have deleted_at field",
      "deleted_at" in admin,
    );

    // For newly created accounts, deleted_at should be null
    TestValidator.equals(
      "newly created admin should have null deleted_at",
      admin.deleted_at,
      null,
    );

    // Verify other required fields are present
    TestValidator.predicate(
      "admin summary should have id",
      typeof admin.id === "string",
    );
    TestValidator.predicate(
      "admin summary should have email",
      typeof admin.email === "string",
    );
    TestValidator.predicate(
      "admin summary should have created_at",
      typeof admin.created_at === "string",
    );
    TestValidator.predicate(
      "admin summary should have updated_at",
      typeof admin.updated_at === "string",
    );
  }

  // Test search with email filter
  const emailSearchResults = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        email: admin1Email,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(emailSearchResults);

  TestValidator.predicate(
    "email search should return results",
    emailSearchResults.data.length > 0,
  );

  const foundAdmin1 = emailSearchResults.data.find(
    (admin) => admin.id === admin1.id,
  );
  if (foundAdmin1) {
    typia.assertGuard(foundAdmin1);

    TestValidator.equals(
      "email filtered admin should match",
      foundAdmin1.email,
      admin1Email,
    );
    TestValidator.equals(
      "email filtered admin should have null deleted_at",
      foundAdmin1.deleted_at,
      null,
    );
  }

  // Test search with sorting by created_at
  const sortedResults = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
        sort: "-created_at",
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(sortedResults);

  TestValidator.predicate(
    "sorted search should return results",
    sortedResults.data.length > 0,
  );

  // Verify all results include deleted_at field structure
  for (const admin of sortedResults.data) {
    TestValidator.predicate(
      "sorted results admin should have deleted_at field in structure",
      admin.deleted_at === null || typeof admin.deleted_at === "string",
    );
  }
}
