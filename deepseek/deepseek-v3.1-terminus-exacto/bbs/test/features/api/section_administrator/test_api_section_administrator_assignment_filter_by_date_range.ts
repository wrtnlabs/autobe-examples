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
 * Test filtering section administrator assignments by assignment date ranges.
 *
 * This test verifies that the assignment search endpoint correctly filters
 * assignments based on assignment_date_start and assignment_date_end parameters.
 * Since we cannot create sections or assignments through available APIs,
 * this test focuses on validating the search endpoint's response structure
 * and error handling with various date range combinations.
 */
export async function test_api_section_administrator_assignment_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Use a valid UUID format for section ID (even if section doesn't exist)
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Test various date range combinations to validate the endpoint behavior
  const now = new Date();
  const pastDate = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const futureDate = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days from now
  // Test 1: Valid date range filtering
  const response1 =
    await api.functional.discussionBoard.superAdmin.sections.assignments.index(
      superAdminConnection,
      {
        sectionId,
        body: {
          assignment_date_start: pastDate,
          assignment_date_end: futureDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionAdministrator.IRequest,
      },
    );
  typia.assert(response1);
  // Validate response structure
  TestValidator.predicate(
    "response has pagination",
    response1.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(response1.data),
  );
  // Test 2: Only start date filter
  const response2 =
    await api.functional.discussionBoard.superAdmin.sections.assignments.index(
      superAdminConnection,
      {
        sectionId,
        body: {
          assignment_date_start: pastDate,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSectionAdministrator.IRequest,
      },
    );
  typia.assert(response2);
  // Test 3: Only end date filter
  const response3 =
    await api.functional.discussionBoard.superAdmin.sections.assignments.index(
      superAdminConnection,
      {
        sectionId,
        body: {
          assignment_date_end: futureDate,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSectionAdministrator.IRequest,
      },
    );
  typia.assert(response3);
  // Test 4: No date filters (all assignments)
  const response4 =
    await api.functional.discussionBoard.superAdmin.sections.assignments.index(
      superAdminConnection,
      {
        sectionId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionAdministrator.IRequest,
      },
    );
  typia.assert(response4);
  // Validate pagination consistency across all tests
  TestValidator.equals("page is consistent", response1.pagination.current, 1);
  TestValidator.predicate(
    "limit is valid",
    response1.pagination.limit > 0 && response1.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response1.pagination.pages >= 0,
  );
  // Test 5: Invalid date range (start after end) - should return empty or error
  await TestValidator.error(
    "invalid date range should handle gracefully",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.assignments.index(
        superAdminConnection,
        {
          sectionId,
          body: {
            assignment_date_start: futureDate,
            assignment_date_end: pastDate,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardSectionAdministrator.IRequest,
        },
      );
    },
  );
}
