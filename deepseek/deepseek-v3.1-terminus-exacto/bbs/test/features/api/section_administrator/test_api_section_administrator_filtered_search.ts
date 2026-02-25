import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdmin";
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

export async function test_api_section_administrator_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator
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
  // Create a test section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Test filtered search with specific permission level and date range
  const searchRequest = {
    permission_level: "moderator",
    assignment_date_start: new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(), // 7 days ago
    assignment_date_end: new Date().toISOString(), // now
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardSuperAdmin.IRequest;
  const result =
    await api.functional.discussionBoard.admin.sections.administrators.index(
      adminConnection,
      {
        sectionId: section.id,
        body: searchRequest,
      },
    );
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals("page number", result.pagination.current, 1);
  TestValidator.equals("page limit", result.pagination.limit, 20);
  TestValidator.predicate(
    "records non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pages non-negative", result.pagination.pages >= 0);
  // Validate data structure for each assignment
  if (result.data.length > 0) {
    result.data.forEach((assignment, index) => {
      typia.assert(assignment);
      // If permission_level filter was applied, validate it matches
      if (searchRequest.permission_level) {
        TestValidator.equals(
          "permission level matches filter",
          assignment.permission_level,
          searchRequest.permission_level,
        );
      }
      // If date range filters were applied, validate assignment dates are within range
      if (
        searchRequest.assignment_date_start &&
        searchRequest.assignment_date_end
      ) {
        const assignmentDate = new Date(assignment.assignment_date).getTime();
        const startDate = new Date(
          searchRequest.assignment_date_start,
        ).getTime();
        const endDate = new Date(searchRequest.assignment_date_end).getTime();
        TestValidator.predicate(
          "assignment date within range",
          assignmentDate >= startDate && assignmentDate <= endDate,
        );
      }
    });
  }
  // Test edge case: no matches with specific filters that shouldn't exist
  const noMatchRequest = {
    permission_level: "non_existent_permission",
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardSuperAdmin.IRequest;
  const emptyResult =
    await api.functional.discussionBoard.admin.sections.administrators.index(
      adminConnection,
      {
        sectionId: section.id,
        body: noMatchRequest,
      },
    );
  typia.assert(emptyResult);
  // Validate empty result handling
  TestValidator.equals(
    "data array empty for no matches",
    emptyResult.data.length,
    0,
  );
  TestValidator.predicate(
    "records count reflects no matches",
    emptyResult.pagination.records === 0,
  );
  TestValidator.predicate(
    "pages count reflects no matches",
    emptyResult.pagination.pages === 0,
  );
}
