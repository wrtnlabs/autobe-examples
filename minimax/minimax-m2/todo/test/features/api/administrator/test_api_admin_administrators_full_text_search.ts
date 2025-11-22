import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdministrator";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

export async function test_api_admin_administrators_full_text_search(
  connection: api.IConnection,
) {
  // Step 1: Create diverse admin accounts for comprehensive search testing
  const adminData1 = {
    email: "john.smith@company.com",
    password_hash: "hashedPassword123",
    first_name: "John",
    last_name: "Smith",
    role_level: "super_admin",
    status: "active",
  } satisfies ITodoAppAdministrator.ICreate;

  const adminData2 = {
    email: "jane.doe@company.com",
    password_hash: "hashedPassword456",
    first_name: "Jane",
    last_name: "Doe",
    role_level: "admin",
    status: "active",
  } satisfies ITodoAppAdministrator.ICreate;

  const adminData3 = {
    email: "bob.johnson@company.com",
    password_hash: "hashedPassword789",
    first_name: "Bob",
    last_name: "Johnson",
    role_level: "moderator",
    status: "active",
  } satisfies ITodoAppAdministrator.ICreate;

  const adminData4 = {
    email: "alice.wonderland@company.com",
    password_hash: "hashedPassword101",
    first_name: "Alice",
    last_name: "Wonderland",
    role_level: "admin",
    status: "suspended",
  } satisfies ITodoAppAdministrator.ICreate;

  // Create the admin accounts
  const admin1: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData1 });
  typia.assert(admin1);

  const admin2: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData2 });
  typia.assert(admin2);

  const admin3: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData3 });
  typia.assert(admin3);

  const admin4: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData4 });
  typia.assert(admin4);

  // Step 2: Test full-text search functionality
  // Test searching for first name "John" - should find admin1
  const searchResult1: IPageITodoAppAdministrator.ISummary =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        search: "John",
        page: 1,
        limit: 10,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(searchResult1);

  // Verify John Smith is found
  TestValidator.equals(
    "John found in search",
    searchResult1.data.some((admin) => admin.first_name === "John"),
    true,
  );

  // Test searching for email domain "company.com" - should find all admins
  const searchResult2: IPageITodoAppAdministrator.ISummary =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        search: "company.com",
        page: 1,
        limit: 10,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(searchResult2);

  // Verify all active admins with company.com email are found
  TestValidator.predicate(
    "all company.com emails found",
    searchResult2.data.length >= 3,
  );

  // Test searching for last name "Doe" - should find admin2
  const searchResult3: IPageITodoAppAdministrator.ISummary =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        search: "Doe",
        page: 1,
        limit: 10,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(searchResult3);

  // Verify Jane Doe is found
  TestValidator.equals(
    "Jane Doe found in search",
    searchResult3.data.some((admin) => admin.last_name === "Doe"),
    true,
  );

  // Test searching for "Wonderland" - should find admin4
  const searchResult4: IPageITodoAppAdministrator.ISummary =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        search: "Wonderland",
        page: 1,
        limit: 10,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(searchResult4);

  // Verify Alice Wonderland is found
  TestValidator.equals(
    "Alice Wonderland found in search",
    searchResult4.data.some((admin) => admin.last_name === "Wonderland"),
    true,
  );

  // Test searching for partial email "bob@company" - should find admin3
  const searchResult5: IPageITodoAppAdministrator.ISummary =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        search: "bob@company",
        page: 1,
        limit: 10,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(searchResult5);

  // Verify Bob Johnson is found by email
  TestValidator.equals(
    "Bob found by email search",
    searchResult5.data.some(
      (admin) => admin.email === "bob.johnson@company.com",
    ),
    true,
  );

  // Test searching for non-existent term - should return empty results
  const searchResult6: IPageITodoAppAdministrator.ISummary =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        search: "NonExistentUser",
        page: 1,
        limit: 10,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(searchResult6);

  // Verify no results for non-existent search
  TestValidator.equals(
    "no results for non-existent search",
    searchResult6.data.length,
    0,
  );

  // Test combined search with multiple matching criteria
  const searchResult7: IPageITodoAppAdministrator.ISummary =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        search: "admin",
        role_level: "admin",
        page: 1,
        limit: 10,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(searchResult7);

  // Verify only admin role level users are returned when filtering by role
  TestValidator.predicate(
    "admin role filter works with search",
    searchResult7.data.every((admin) => admin.role_level === "admin"),
  );
}
