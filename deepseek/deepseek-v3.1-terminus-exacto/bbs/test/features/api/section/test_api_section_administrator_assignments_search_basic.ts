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
 * Test the basic functionality of searching administrator assignments for a section.
 * Create a section first, then use the search endpoint with minimal filters to retrieve
 * all assignments. Validate that the response includes paginated results with correct
 * assignment summaries, permission levels, assignment dates, and administrator information.
 */
export async function test_api_section_administrator_assignments_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create authenticated connection with the token
  const authenticatedAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: admin.token.access },
  };
  // Create a section to have assignments to search for
  const section = await generate_random_discussion_board_admin_sections_create(
    authenticatedAdminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 1,
          wordMax: 3,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Search for administrator assignments with minimal filters
  const searchResult =
    await api.functional.discussionBoard.admin.sections.assignments.index(
      authenticatedAdminConnection,
      {
        sectionId: section.id,
        body: {
          // No specific filters to get all assignments
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionAdministrator.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate assignment summaries structure (handle empty case)
  if (searchResult.data.length > 0) {
    searchResult.data.forEach((assignment, index) => {
      TestValidator.predicate(
        `assignment ${index} has id`,
        assignment.id.length > 0,
      );
      TestValidator.predicate(
        `assignment ${index} has permission level`,
        assignment.permission_level.length > 0,
      );
      TestValidator.predicate(
        `assignment ${index} has assignment date`,
        assignment.assignment_date.length > 0,
      );
      // Validate that either admin or superAdmin is present (but not both)
      const hasAdmin = assignment.admin !== null;
      const hasSuperAdmin = assignment.superAdmin !== null;
      TestValidator.predicate(
        `assignment ${index} has exactly one administrator type`,
        hasAdmin !== hasSuperAdmin,
      );
      if (assignment.admin) {
        TestValidator.predicate(
          `assignment ${index} admin has id`,
          assignment.admin.id.length > 0,
        );
        TestValidator.predicate(
          `assignment ${index} admin has email`,
          assignment.admin.email.length > 0,
        );
        TestValidator.predicate(
          `assignment ${index} admin has display name`,
          assignment.admin.display_name.length > 0,
        );
        TestValidator.predicate(
          `assignment ${index} admin has created_at`,
          assignment.admin.created_at.length > 0,
        );
      }
      if (assignment.superAdmin) {
        TestValidator.predicate(
          `assignment ${index} superAdmin has id`,
          assignment.superAdmin.id.length > 0,
        );
        TestValidator.predicate(
          `assignment ${index} superAdmin has email`,
          assignment.superAdmin.email.length > 0,
        );
        TestValidator.predicate(
          `assignment ${index} superAdmin has privilege level`,
          assignment.superAdmin.privilege_level.length > 0,
        );
        TestValidator.predicate(
          `assignment ${index} superAdmin has created_at`,
          assignment.superAdmin.created_at.length > 0,
        );
      }
    });
  }
}
