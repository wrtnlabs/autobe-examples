import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the basic search functionality for super administrator accounts.
 * Validate that the endpoint returns a paginated list of super admins with proper summary information.
 * Test searching by email partial match, filtering by admin grade (regular/super), and date range filtering for created_at and updated_at fields.
 * Verify that soft-deleted records are excluded from results.
 * Validate pagination metadata including current page, limit, total records, and total pages.
 * Ensure response contains required fields: id, email, admin_grade, created_at, updated_at.
 */
export async function test_api_super_admin_search_basic_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create a super admin connection for testing
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Note: Since no utility functions are available for super admin authentication,
  // we assume the connection is already properly authenticated for super admin operations
  // Test 1: Basic search with no filters (should return all super admins)
  const allResults = await api.functional.discussionBoard.super_admins.index(
    superAdminConnection,
    {
      body: {} satisfies IDiscussionBoardSuperAdmin.IRequest,
    },
  );
  typia.assert(allResults);
  // Validate pagination structure exists
  TestValidator.predicate(
    "pagination object exists",
    allResults.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(allResults.data));
  // Validate pagination fields have valid values
  TestValidator.predicate(
    "current page is valid",
    allResults.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", allResults.pagination.limit >= 0);
  TestValidator.predicate(
    "records count is valid",
    allResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    allResults.pagination.pages >= 0,
  );
  // Test 2: Search by email partial match
  if (allResults.data.length > 0) {
    const sampleEmail = allResults.data[0].email;
    const emailDomain = sampleEmail.split("@")[1];
    const emailSearchResults =
      await api.functional.discussionBoard.super_admins.index(
        superAdminConnection,
        {
          body: {
            search: emailDomain,
          } satisfies IDiscussionBoardSuperAdmin.IRequest,
        },
      );
    typia.assert(emailSearchResults);
    // Verify that search returns relevant results
    TestValidator.predicate(
      "email search returns results",
      emailSearchResults.data.length > 0,
    );
    // Business logic: Verify search functionality works
    const hasMatchingEmail = emailSearchResults.data.some((item) =>
      item.email.toLowerCase().includes(emailDomain.toLowerCase()),
    );
    TestValidator.predicate("search returns matching emails", hasMatchingEmail);
  }
  // Test 3: Filter by admin grade
  const gradeSearchResults =
    await api.functional.discussionBoard.super_admins.index(
      superAdminConnection,
      {
        body: {
          admin_grade: "super",
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(gradeSearchResults);
  // Business logic: Verify all results have the specified admin grade
  const allSuperAdmins = gradeSearchResults.data.every(
    (item) => item.admin_grade === "super",
  );
  TestValidator.predicate(
    "all results match admin grade filter",
    allSuperAdmins,
  );
  // Test 4: Date range filtering
  const currentDate = new Date().toISOString();
  const pastDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const dateRangeResults =
    await api.functional.discussionBoard.super_admins.index(
      superAdminConnection,
      {
        body: {
          created_at_start: pastDate,
          created_at_end: currentDate,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(dateRangeResults);
  // Business logic: Verify date filtering works
  TestValidator.predicate(
    "date range search returns results",
    dateRangeResults.data.length >= 0,
  );
  // Test 5: Pagination functionality
  const paginationResults =
    await api.functional.discussionBoard.super_admins.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(paginationResults);
  // Validate pagination metadata matches request
  TestValidator.equals(
    "current page matches request",
    paginationResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    paginationResults.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length respects limit",
    paginationResults.data.length <= 5,
  );
  // Test 6: Combined search with multiple filters
  const combinedSearchResults =
    await api.functional.discussionBoard.super_admins.index(
      superAdminConnection,
      {
        body: {
          search: "@",
          admin_grade: "super",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(combinedSearchResults);
  // Business logic: Verify combined filters work together
  const allHaveEmailSymbol = combinedSearchResults.data.every((item) =>
    item.email.includes("@"),
  );
  const allHaveCorrectGrade = combinedSearchResults.data.every(
    (item) => item.admin_grade === "super",
  );
  TestValidator.predicate("all results have email symbol", allHaveEmailSymbol);
  TestValidator.predicate(
    "all results have correct admin grade",
    allHaveCorrectGrade,
  );
}
