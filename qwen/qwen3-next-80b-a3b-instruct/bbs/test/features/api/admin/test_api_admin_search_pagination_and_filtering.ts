import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardAdmin";

export async function test_api_admin_search_pagination_and_filtering(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to establish search permissions
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePass123!";
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Create additional admin accounts for testing pagination and filtering
  const totalAdmins = 15;
  const createdAdmins: IEconomicBoardAdmin.IAuthorized[] = [];

  for (let i = 0; i < totalAdmins; i++) {
    // Create admin with deterministic email patterns
    const email =
      i < 8
        ? `${RandomGenerator.name().toLowerCase().replace(/\s/g, ".")}@company.com`
        : `${RandomGenerator.name().toLowerCase().replace(/\s/g, ".")}@external.org`;

    const createdAdmin = await api.functional.auth.admin.join(connection, {
      body: {
        email: email,
        password: adminPassword,
      } satisfies IEconomicBoardAdmin.IJoin,
    });
    typia.assert(createdAdmin);
    createdAdmins.push(createdAdmin);
  }

  // Step 3: Test pagination with limit=5 and page=1 (first 5 results)
  const searchResponse1: IPageIEconomicBoardAdmin.ISummary =
    await api.functional.economicBoard.admin.admins.search(connection, {
      body: {
        limit: 5,
        page: 1,
      } satisfies IEconomicBoardAdmin.IRequest,
    });
  typia.assert(searchResponse1);
  TestValidator.equals(
    "first page should have exactly 5 results",
    searchResponse1.pagination.limit,
    5,
  );
  TestValidator.equals(
    "first page should have 5 items",
    searchResponse1.data.length,
    5,
  );
  TestValidator.predicate(
    "first page should be page 1",
    searchResponse1.pagination.current === 1,
  );

  // Step 4: Test pagination with limit=5 and page=2 (next 5 results)
  const searchResponse2: IPageIEconomicBoardAdmin.ISummary =
    await api.functional.economicBoard.admin.admins.search(connection, {
      body: {
        limit: 5,
        page: 2,
      } satisfies IEconomicBoardAdmin.IRequest,
    });
  typia.assert(searchResponse2);
  TestValidator.equals(
    "second page should have exactly 5 results",
    searchResponse2.pagination.limit,
    5,
  );
  TestValidator.equals(
    "second page should have 5 items",
    searchResponse2.data.length,
    5,
  );
  TestValidator.predicate(
    "second page should be page 2",
    searchResponse2.pagination.current === 2,
  );

  // Step 5: Test pagination with limit=5 and page=3 (final 5 results)
  const searchResponse3: IPageIEconomicBoardAdmin.ISummary =
    await api.functional.economicBoard.admin.admins.search(connection, {
      body: {
        limit: 5,
        page: 3,
      } satisfies IEconomicBoardAdmin.IRequest,
    });
  typia.assert(searchResponse3);
  TestValidator.equals(
    "third page should have exactly 5 results",
    searchResponse3.pagination.limit,
    5,
  );
  TestValidator.equals(
    "third page should have 5 items",
    searchResponse3.data.length,
    5,
  );
  TestValidator.predicate(
    "third page should be page 3",
    searchResponse3.pagination.current === 3,
  );

  // Step 6: Validate total count and pages calculation from API
  TestValidator.equals(
    "total records should equal total created admins",
    searchResponse3.pagination.records,
    totalAdmins,
  );
  TestValidator.equals(
    "total pages should be 3 (15 admins / 5 per page)",
    searchResponse3.pagination.pages,
    3,
  );

  // Step 7: Test email filtering with partial match '@company.com'
  // Since we know which admins have company emails, we expect 8 results
  const searchResponse4: IPageIEconomicBoardAdmin.ISummary =
    await api.functional.economicBoard.admin.admins.search(connection, {
      body: {
        email: "@company.com",
      } satisfies IEconomicBoardAdmin.IRequest,
    });
  typia.assert(searchResponse4);
  TestValidator.equals(
    "email filter should return exactly 8 company admins",
    searchResponse4.data.length,
    8,
  );
  TestValidator.predicate(
    "all returned emails should contain '@company.com'",
    searchResponse4.data.every((admin) => admin.email.endsWith("@company.com")),
  );

  // Step 8: Test email filtering with partial match '@external.org'
  const searchResponse5: IPageIEconomicBoardAdmin.ISummary =
    await api.functional.economicBoard.admin.admins.search(connection, {
      body: {
        email: "@external.org",
      } satisfies IEconomicBoardAdmin.IRequest,
    });
  typia.assert(searchResponse5);
  TestValidator.equals(
    "email filter should return exactly 7 external org admins",
    searchResponse5.data.length,
    7,
  );
  TestValidator.predicate(
    "all returned emails should contain '@external.org'",
    searchResponse5.data.every((admin) =>
      admin.email.endsWith("@external.org"),
    ),
  );

  // Step 9: Test with default parameters (no filters, pagination defaults)
  const searchResponse6: IPageIEconomicBoardAdmin.ISummary =
    await api.functional.economicBoard.admin.admins.search(connection, {
      body: {} satisfies IEconomicBoardAdmin.IRequest,
    });
  typia.assert(searchResponse6);
  TestValidator.equals(
    "default limit should be 25",
    searchResponse6.pagination.limit,
    25,
  );
  TestValidator.equals(
    "default page should be 1",
    searchResponse6.pagination.current,
    1,
  );
  TestValidator.equals(
    "default should return all 15 admins",
    searchResponse6.pagination.records,
    totalAdmins,
  );
  TestValidator.equals(
    "default should have 1 page",
    searchResponse6.pagination.pages,
    1,
  );

  // Step 10: Test last login date range filtering
  // Create a known range: first created admin as from, last created admin as to
  const firstCreatedAdmin = createdAdmins[0];
  const lastCreatedAdmin = createdAdmins[createdAdmins.length - 1];

  // Search for admins created from first admin's creation time onwards
  const searchResponse7: IPageIEconomicBoardAdmin.ISummary =
    await api.functional.economicBoard.admin.admins.search(connection, {
      body: {
        lastLoginFrom: firstCreatedAdmin.last_login,
      } satisfies IEconomicBoardAdmin.IRequest,
    });
  typia.assert(searchResponse7);
  TestValidator.equals(
    "lastLoginFrom with first admin's date should return all 15 admins",
    searchResponse7.data.length,
    totalAdmins,
  );

  // Search for admins with last_login on or before last admin's creation
  const searchResponse8: IPageIEconomicBoardAdmin.ISummary =
    await api.functional.economicBoard.admin.admins.search(connection, {
      body: {
        lastLoginTo: lastCreatedAdmin.last_login,
      } satisfies IEconomicBoardAdmin.IRequest,
    });
  typia.assert(searchResponse8);
  TestValidator.equals(
    "lastLoginTo with last admin's date should return all 15 admins",
    searchResponse8.data.length,
    totalAdmins,
  );

  // Search for admins within the exact range of creation times
  const searchResponse9: IPageIEconomicBoardAdmin.ISummary =
    await api.functional.economicBoard.admin.admins.search(connection, {
      body: {
        lastLoginFrom: firstCreatedAdmin.last_login,
        lastLoginTo: lastCreatedAdmin.last_login,
      } satisfies IEconomicBoardAdmin.IRequest,
    });
  typia.assert(searchResponse9);
  TestValidator.equals(
    "date range filtering should return all 15 admins",
    searchResponse9.data.length,
    totalAdmins,
  );

  // Step 11: Validate response structure - ensure no sensitive fields are included
  // The IPageIEconomicBoardAdmin.ISummary type from schema confirms the exact fields
  // that should be present. The response type must match exactly.
  TestValidator.equals(
    "response data must contain exactly 6 fields",
    Object.keys(searchResponse9.data[0]).length,
    6,
  );
  TestValidator.predicate(
    "all returned admins must have required fields",
    searchResponse9.data.every(
      (admin) =>
        "id" in admin &&
        "email" in admin &&
        "created_at" in admin &&
        "last_login" in admin &&
        "is_active" in admin &&
        "auth_jwt_id" in admin,
    ),
  );

  // Step 12: Validate sort functionality
  // Sort by email ascending
  const searchResponse10: IPageIEconomicBoardAdmin.ISummary =
    await api.functional.economicBoard.admin.admins.search(connection, {
      body: {
        sort: "email",
        order: "asc",
      } satisfies IEconomicBoardAdmin.IRequest,
    });
  typia.assert(searchResponse10);

  // Check first element has the "lowest" email alphabetically
  const emails = searchResponse10.data.map((a) => a.email);
  const sortedEmails = [...emails].sort();
  TestValidator.equals(
    "first email in sorted result should be first in alphabetical order",
    searchResponse10.data[0].email,
    sortedEmails[0],
  );

  // Sort by created_at descending (most recent first)
  const searchResponse11: IPageIEconomicBoardAdmin.ISummary =
    await api.functional.economicBoard.admin.admins.search(connection, {
      body: {
        sort: "created_at",
        order: "desc",
      } satisfies IEconomicBoardAdmin.IRequest,
    });
  typia.assert(searchResponse11);

  // Check first element has the latest created_at
  const createdAges = searchResponse11.data.map((a) =>
    new Date(a.created_at).getTime(),
  );
  const sortedDates = [...createdAges].sort((a, b) => b - a);
  TestValidator.equals(
    "first created_at in sorted result should be the latest",
    new Date(searchResponse11.data[0].created_at).getTime(),
    sortedDates[0],
  );

  // Step 13: Validate endpoint response type is IPageIEconomicBoardAdmin.ISummary
  const firstAdmin = searchResponse10.data[0];
  typia.assert<IPageIEconomicBoardAdmin.ISummary>({
    pagination: searchResponse10.pagination,
    data: searchResponse10.data,
  });
}
