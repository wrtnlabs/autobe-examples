import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdministrator";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

export async function test_api_admin_administrators_deleted_accounts_filtering(
  connection: api.IConnection,
) {
  // 1. Create multiple admin accounts with different roles and statuses
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const deletedSuperAdminEmail = typia.random<string & tags.Format<"email">>();
  const deletedAdminEmail = typia.random<string & tags.Format<"email">>();

  // Create active super admin
  const superAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: superAdminEmail,
      password_hash: typia.random<string>(),
      first_name: "Super",
      last_name: "Admin",
      role_level: "super_admin",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(superAdmin);

  // Create active admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password_hash: typia.random<string>(),
      first_name: "Active",
      last_name: "Admin",
      role_level: "admin",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(admin);

  // Create active moderator
  const moderator = await api.functional.auth.admin.join(connection, {
    body: {
      email: moderatorEmail,
      password_hash: typia.random<string>(),
      first_name: "Active",
      last_name: "Moderator",
      role_level: "moderator",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(moderator);

  // Create soft-deleted super admin (for testing include_deleted functionality)
  const deletedSuperAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: deletedSuperAdminEmail,
      password_hash: typia.random<string>(),
      first_name: "Deleted",
      last_name: "SuperAdmin",
      role_level: "super_admin",
      status: "deactivated",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(deletedSuperAdmin);

  // Create soft-deleted admin
  const deletedAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: deletedAdminEmail,
      password_hash: typia.random<string>(),
      first_name: "Deleted",
      last_name: "Admin",
      role_level: "admin",
      status: "deactivated",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(deletedAdmin);

  // 2. Test 1: Search with default settings (include_deleted: false)
  // Should only return active accounts
  const searchWithoutDeleted =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(searchWithoutDeleted);

  // Validate response structure
  TestValidator.equals(
    "pagination structure",
    searchWithoutDeleted.pagination.current,
    1,
  );
  TestValidator.equals("page limit", searchWithoutDeleted.pagination.limit, 10);
  TestValidator.predicate("has records", searchWithoutDeleted.data.length > 0);

  // Verify only active accounts are returned
  const activeAccountEmails = searchWithoutDeleted.data.map(
    (admin) => admin.email,
  );
  TestValidator.predicate(
    "contains active super admin",
    activeAccountEmails.includes(superAdminEmail),
  );
  TestValidator.predicate(
    "contains active admin",
    activeAccountEmails.includes(adminEmail),
  );
  TestValidator.predicate(
    "contains active moderator",
    activeAccountEmails.includes(moderatorEmail),
  );
  TestValidator.predicate(
    "excludes deleted super admin",
    !activeAccountEmails.includes(deletedSuperAdminEmail),
  );
  TestValidator.predicate(
    "excludes deleted admin",
    !activeAccountEmails.includes(deletedAdminEmail),
  );

  // 3. Test 2: Search with include_deleted: true
  // Should include both active and soft-deleted accounts
  const searchWithDeleted =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        page: 1,
        limit: 10,
        include_deleted: true,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(searchWithDeleted);

  // Verify both active and deleted accounts are included
  const allAccountEmails = searchWithDeleted.data.map((admin) => admin.email);
  TestValidator.predicate(
    "contains active super admin",
    allAccountEmails.includes(superAdminEmail),
  );
  TestValidator.predicate(
    "contains active admin",
    allAccountEmails.includes(adminEmail),
  );
  TestValidator.predicate(
    "contains active moderator",
    allAccountEmails.includes(moderatorEmail),
  );
  TestValidator.predicate(
    "includes deleted super admin",
    allAccountEmails.includes(deletedSuperAdminEmail),
  );
  TestValidator.predicate(
    "includes deleted admin",
    allAccountEmails.includes(deletedAdminEmail),
  );

  // Verify total count is higher when including deleted
  TestValidator.predicate(
    "more records with deleted included",
    searchWithDeleted.data.length >= searchWithoutDeleted.data.length,
  );

  // 4. Test 3: Role-level filtering with include_deleted
  // Test filtering for super_admin role including deleted accounts
  const superAdminSearch =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        page: 1,
        limit: 10,
        role_level: "super_admin",
        include_deleted: true,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(superAdminSearch);

  // Should find both active and deleted super admins
  const superAdminResults = superAdminSearch.data.filter(
    (admin) => admin.role_level === "super_admin",
  );
  TestValidator.predicate(
    "finds active super admin",
    superAdminResults.some((admin) => admin.email === superAdminEmail),
  );
  TestValidator.predicate(
    "finds deleted super admin",
    superAdminResults.some((admin) => admin.email === deletedSuperAdminEmail),
  );

  // 5. Test 4: Status filtering with include_deleted
  // Test filtering for deactivated status
  const deactivatedSearch =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "deactivated",
        include_deleted: true,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(deactivatedSearch);

  // Should only return deactivated accounts
  const deactivatedResults = deactivatedSearch.data;
  TestValidator.predicate(
    "only returns deactivated accounts",
    deactivatedResults.every(
      (admin) =>
        admin.email === deletedSuperAdminEmail ||
        admin.email === deletedAdminEmail,
    ),
  );
  TestValidator.predicate(
    "includes both deleted accounts",
    deactivatedResults.length >= 2,
  );

  // 6. Test 5: Email-specific search with deleted accounts
  const emailSearch = await api.functional.todoApp.admin.administrators.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        email: deletedAdminEmail,
        include_deleted: true,
      } satisfies ITodoAppAdministrator.IRequest,
    },
  );
  typia.assert(emailSearch);

  // Should find the specific deleted admin by email
  TestValidator.equals(
    "finds deleted admin by email",
    emailSearch.data.length,
    1,
  );
  TestValidator.equals(
    "email matches",
    emailSearch.data[0].email,
    deletedAdminEmail,
  );

  // 7. Test 6: Search without include_deleted for specific email
  // Should not find deleted account when include_deleted is false
  const emailSearchWithoutDeleted =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        page: 1,
        limit: 10,
        email: deletedAdminEmail,
        include_deleted: false,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(emailSearchWithoutDeleted);

  // Should not find the deleted admin
  TestValidator.equals(
    "does not find deleted admin without flag",
    emailSearchWithoutDeleted.data.length,
    0,
  );

  // 8. Test 7: Pagination with deleted accounts
  const paginationSearch =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        page: 1,
        limit: 2,
        include_deleted: true,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(paginationSearch);

  // Validate pagination metadata
  TestValidator.equals(
    "pagination page",
    paginationSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationSearch.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination has records",
    paginationSearch.data.length > 0,
  );
  TestValidator.predicate(
    "total records > page size",
    paginationSearch.pagination.records > paginationSearch.data.length,
  );

  // 9. Test 8: Full-text search across mixed account states
  const fullTextSearch =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "Admin",
        include_deleted: true,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(fullTextSearch);

  // Should find accounts containing "Admin" in names (both active and deleted)
  const adminSearchResults = fullTextSearch.data;
  TestValidator.predicate(
    "finds accounts with 'Admin' in name",
    adminSearchResults.length > 0,
  );

  // Verify we have both active and deleted accounts in results
  const foundEmails = adminSearchResults.map((admin) => admin.email);
  TestValidator.predicate(
    "includes active admin",
    foundEmails.includes(adminEmail),
  );
  TestValidator.predicate(
    "includes deleted admin",
    foundEmails.includes(deletedAdminEmail),
  );

  console.log(
    "All administrator deleted account filtering tests passed successfully!",
  );
}
