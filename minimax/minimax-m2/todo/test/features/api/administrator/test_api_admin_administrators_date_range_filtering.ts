import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdministrator";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

export async function test_api_admin_administrators_date_range_filtering(
  connection: api.IConnection,
) {
  // Create first admin account
  const firstAdminEmail = typia.random<string & tags.Format<"email">>();
  const firstAdmin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: firstAdminEmail,
        password_hash: typia.random<string>(),
        role_level: "admin",
        status: "active",
        first_name: "First",
        last_name: "Admin",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(firstAdmin);

  // Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Create second admin account
  const secondAdminEmail = typia.random<string & tags.Format<"email">>();
  const secondAdmin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: secondAdminEmail,
        password_hash: typia.random<string>(),
        role_level: "super_admin",
        status: "active",
        first_name: "Second",
        last_name: "Admin",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(secondAdmin);

  // Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Create third admin account
  const thirdAdminEmail = typia.random<string & tags.Format<"email">>();
  const thirdAdmin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: thirdAdminEmail,
        password_hash: typia.random<string>(),
        role_level: "moderator",
        status: "active",
        first_name: "Third",
        last_name: "Admin",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(thirdAdmin);

  // Get all admins to capture actual creation timestamps
  const allAdminsSearch =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        page: 1,
        limit: 100,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(allAdminsSearch);

  // Extract creation timestamps for each admin
  const firstAdminData = allAdminsSearch.data.find(
    (admin) => admin.id === firstAdmin.id,
  );
  const secondAdminData = allAdminsSearch.data.find(
    (admin) => admin.id === secondAdmin.id,
  );
  const thirdAdminData = allAdminsSearch.data.find(
    (admin) => admin.id === thirdAdmin.id,
  );

  if (!firstAdminData || !secondAdminData || !thirdAdminData) {
    throw new Error("Failed to find all created admins in search results");
  }

  const firstAdminCreatedAt = firstAdminData.created_at;
  const secondAdminCreatedAt = secondAdminData.created_at;
  const thirdAdminCreatedAt = thirdAdminData.created_at;

  // Test 1: Search with date range that includes all admins
  const allAdminsRangeSearch: IPageITodoAppAdministrator.ISummary =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        page: 1,
        limit: 100,
        created_after: firstAdminCreatedAt,
        created_before: thirdAdminCreatedAt,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(allAdminsRangeSearch);

  TestValidator.predicate(
    "should return all 3 admins in the date range",
    allAdminsRangeSearch.data.length === 3,
  );

  // Verify all expected admins are in results
  const allAdminIds = [firstAdmin.id, secondAdmin.id, thirdAdmin.id];
  const returnedAdminIds = allAdminsRangeSearch.data.map((admin) => admin.id);
  TestValidator.equals(
    "all created admins should be in search results",
    returnedAdminIds.sort(),
    allAdminIds.sort(),
  );

  // Test 2: Search with narrow date range (only second admin)
  const narrowRangeStart = new Date(secondAdminCreatedAt).getTime() - 500;
  const narrowRangeEnd = new Date(secondAdminCreatedAt).getTime() + 500;

  const narrowSearch: IPageITodoAppAdministrator.ISummary =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        page: 1,
        limit: 100,
        created_after: new Date(narrowRangeStart).toISOString(),
        created_before: new Date(narrowRangeEnd).toISOString(),
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(narrowSearch);

  TestValidator.predicate(
    "narrow date range should return only second admin",
    narrowSearch.data.length === 1 &&
      narrowSearch.data[0].id === secondAdmin.id,
  );

  // Test 3: Search with empty date range (no results expected)
  const emptyRangeStart = new Date(thirdAdminCreatedAt).getTime() + 1000;
  const emptyRangeEnd = new Date(emptyRangeStart).getTime() + 1000;

  const emptySearch: IPageITodoAppAdministrator.ISummary =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        page: 1,
        limit: 100,
        created_after: new Date(emptyRangeStart).toISOString(),
        created_before: new Date(emptyRangeEnd).toISOString(),
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(emptySearch);

  TestValidator.predicate(
    "empty date range should return no results",
    emptySearch.data.length === 0,
  );

  // Test 4: Search with only created_after filter
  const afterOnlySearch: IPageITodoAppAdministrator.ISummary =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        page: 1,
        limit: 100,
        created_after: secondAdminCreatedAt,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(afterOnlySearch);

  TestValidator.predicate(
    "created_after filter should return second and third admins",
    afterOnlySearch.data.length === 2 &&
      afterOnlySearch.data.some((admin) => admin.id === secondAdmin.id) &&
      afterOnlySearch.data.some((admin) => admin.id === thirdAdmin.id),
  );

  // Test 5: Search with only created_before filter
  const beforeOnlySearch: IPageITodoAppAdministrator.ISummary =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        page: 1,
        limit: 100,
        created_before: secondAdminCreatedAt,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(beforeOnlySearch);

  TestValidator.predicate(
    "created_before filter should return only first admin",
    beforeOnlySearch.data.length === 1 &&
      beforeOnlySearch.data[0].id === firstAdmin.id,
  );

  // Verify pagination metadata for date range searches
  TestValidator.equals(
    "pagination metadata should be correct for date range search",
    allAdminsRangeSearch.pagination.records,
    3,
  );
  TestValidator.equals(
    "current page should be 1",
    allAdminsRangeSearch.pagination.current,
    1,
  );
}
