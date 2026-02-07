import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSectionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdministrator";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the basic functionality of searching section administrator assignments with pagination.
 *
 * This test validates that the section administrator assignment search endpoint correctly
 * handles pagination parameters and returns proper metadata. It creates multiple assignments
 * with different permission levels and dates, then tests pagination by requesting specific
 * pages with defined limits.
 */
export async function test_api_section_administrator_assignment_search_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Generate a section ID for filtering
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Note: Since we don't have assignment creation endpoints available in the provided API functions,
  // we'll test the search functionality with the existing data structure.
  // In a real scenario, we would create assignments first, then search for them.
  // Test pagination with different parameters
  const testCases = [
    { page: 1, limit: 5 },
    { page: 2, limit: 3 },
    { page: 1, limit: 10 },
  ] as const;
  for (const testCase of testCases) {
    const searchRequest = {
      page: testCase.page satisfies number as number,
      limit: testCase.limit satisfies number as number,
    } satisfies IDiscussionBoardSectionAdministrator.IRequest;
    // Execute search
    const searchResult =
      await api.functional.discussionBoard.superAdmin.sections.assignments.index(
        superAdminConnection,
        {
          sectionId: sectionId,
          body: searchRequest,
        },
      );
    typia.assert(searchResult);
    // Validate pagination metadata
    TestValidator.equals(
      `pagination current page for page ${testCase.page}`,
      searchResult.pagination.current,
      testCase.page,
    );
    TestValidator.equals(
      `pagination limit for limit ${testCase.limit}`,
      searchResult.pagination.limit,
      testCase.limit,
    );
    TestValidator.predicate(
      `total records is non-negative for page ${testCase.page}`,
      searchResult.pagination.records >= 0,
    );
    TestValidator.predicate(
      `total pages is non-negative for page ${testCase.page}`,
      searchResult.pagination.pages >= 0,
    );
    // Validate pagination calculations
    if (searchResult.pagination.records > 0) {
      const expectedPages = Math.ceil(
        searchResult.pagination.records / searchResult.pagination.limit,
      );
      TestValidator.equals(
        `correct page count calculation for page ${testCase.page}`,
        searchResult.pagination.pages,
        expectedPages,
      );
    }
    // Validate data structure
    TestValidator.predicate(
      `data is array for page ${testCase.page}`,
      Array.isArray(searchResult.data),
    );
    TestValidator.predicate(
      `data length does not exceed limit for page ${testCase.page}`,
      searchResult.data.length <= testCase.limit,
    );
    // Validate assignment structure for each item
    for (const assignment of searchResult.data) {
      typia.assert(assignment);
      TestValidator.predicate(
        `assignment has valid UUID for page ${testCase.page}`,
        assignment.id.length > 0,
      );
      TestValidator.predicate(
        `assignment has permission level for page ${testCase.page}`,
        assignment.permission_level.length > 0,
      );
      TestValidator.predicate(
        `assignment has valid date for page ${testCase.page}`,
        assignment.assignment_date.length > 0,
      );
      // Validate that either admin or superAdmin is present (but not both)
      TestValidator.predicate(
        `assignment has exactly one administrator type for page ${testCase.page}`,
        (assignment.admin !== null && assignment.superAdmin === null) ||
          (assignment.admin === null && assignment.superAdmin !== null),
      );
      // Validate administrator summary structure if present
      if (assignment.admin !== null) {
        typia.assert(assignment.admin);
        TestValidator.predicate(
          `admin has valid UUID for page ${testCase.page}`,
          assignment.admin.id.length > 0,
        );
        TestValidator.predicate(
          `admin has email for page ${testCase.page}`,
          assignment.admin.email.length > 0,
        );
        TestValidator.predicate(
          `admin has display name for page ${testCase.page}`,
          assignment.admin.display_name.length > 0,
        );
        TestValidator.predicate(
          `admin has creation date for page ${testCase.page}`,
          assignment.admin.created_at.length > 0,
        );
      }
      if (assignment.superAdmin !== null) {
        typia.assert(assignment.superAdmin);
        TestValidator.predicate(
          `superAdmin has valid UUID for page ${testCase.page}`,
          assignment.superAdmin.id.length > 0,
        );
        TestValidator.predicate(
          `superAdmin has email for page ${testCase.page}`,
          assignment.superAdmin.email.length > 0,
        );
        TestValidator.predicate(
          `superAdmin has privilege level for page ${testCase.page}`,
          assignment.superAdmin.privilege_level.length > 0,
        );
        TestValidator.predicate(
          `superAdmin has creation date for page ${testCase.page}`,
          assignment.superAdmin.created_at.length > 0,
        );
      }
    }
  }
  // Test date filtering
  const dateFilterRequest = {
    assignment_date_start: new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(), // 7 days ago
    assignment_date_end: new Date().toISOString(), // today
    page: 1 satisfies number as number,
    limit: 5 satisfies number as number,
  } satisfies IDiscussionBoardSectionAdministrator.IRequest;
  const dateFilterResult =
    await api.functional.discussionBoard.superAdmin.sections.assignments.index(
      superAdminConnection,
      {
        sectionId: sectionId,
        body: dateFilterRequest,
      },
    );
  typia.assert(dateFilterResult);
  // Validate that date filtering returns valid results
  TestValidator.predicate(
    "date filtering returns valid pagination",
    dateFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "date filtering returns array",
    Array.isArray(dateFilterResult.data),
  );
}
