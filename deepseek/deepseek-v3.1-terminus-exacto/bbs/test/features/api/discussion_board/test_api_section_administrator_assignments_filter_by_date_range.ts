import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test filtering administrator assignments by assignment date ranges.
 *
 * This test validates the date range filtering functionality for section administrator assignments.
 * Since assignment creation endpoint is not available, this test focuses on testing the
 * search functionality with date range parameters against the existing data structure.
 */
export async function test_api_section_administrator_assignments_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a section for testing
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Test various date range combinations
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const testRanges = [
    {
      name: "Recent assignments",
      start: new Date(now.getTime() - 7 * oneDayMs).toISOString(),
      end: now.toISOString(),
    },
    {
      name: "Past week",
      start: new Date(now.getTime() - 14 * oneDayMs).toISOString(),
      end: new Date(now.getTime() - 7 * oneDayMs).toISOString(),
    },
    {
      name: "Specific day",
      start: new Date(now.getTime() - oneDayMs).toISOString(),
      end: new Date(now.getTime() - oneDayMs).toISOString(),
    },
    {
      name: "Future date",
      start: new Date(now.getTime() + oneDayMs).toISOString(),
      end: new Date(now.getTime() + 2 * oneDayMs).toISOString(),
    },
  ];
  for (const range of testRanges) {
    // Search assignments within date range
    const searchResult =
      await api.functional.discussionBoard.admin.sections.assignments.index(
        adminConnection,
        {
          sectionId: section.id,
          body: {
            assignment_date_start: range.start,
            assignment_date_end: range.end,
            limit: 100,
          } satisfies IDiscussionBoardSectionAdministrator.IRequest,
        },
      );
    typia.assert(searchResult);
    // Validate that the search endpoint responds correctly with pagination structure
    TestValidator.predicate(
      `${range.name} - valid pagination structure`,
      searchResult.pagination.records >= 0 &&
        searchResult.pagination.current >= 0 &&
        searchResult.pagination.limit > 0 &&
        searchResult.pagination.pages >= 0,
    );
    // Validate that data array length matches pagination records
    TestValidator.equals(
      `${range.name} - data matches records count`,
      searchResult.data.length,
      Math.min(searchResult.pagination.records, searchResult.pagination.limit),
    );
    // Validate that all returned assignments have valid structure
    for (const assignment of searchResult.data) {
      typia.assert(assignment);
      // Validate assignment has either admin or superAdmin (but not both)
      TestValidator.predicate(
        `${range.name} - valid assignment structure`,
        (assignment.admin === null && assignment.superAdmin !== null) ||
          (assignment.admin !== null && assignment.superAdmin === null),
      );
    }
  }
}
