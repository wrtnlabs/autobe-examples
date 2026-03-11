import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignment";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorAssignment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_administrator_assignments_create } from "../../../generate/generate_random_discussion_board_super_admin_administrator_assignments_create";
import { prepare_random_discussion_board_administrator_assignment } from "../../../prepare/prepare_random_discussion_board_administrator_assignment";

export async function test_api_administrator_assignments_search_by_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create assignments with distinct reason texts containing target keywords
  const assignments = await ArrayUtil.asyncRepeat(4, async (index) => {
    const reasonTexts = [
      `Performance review completed for Q1`, // keyword at beginning
      `Demonstrated excellent leadership qualities in project`, // keyword in middle
      `Strong technical skills assessment passed`, // keyword in middle
      `Team collaboration initiative successful`, // keyword at beginning
    ];
    const assignment =
      await generate_random_discussion_board_super_admin_administrator_assignments_create(
        superAdminConnection,
        {
          body: {
            old_role: "member",
            new_role: "admin",
            assignment_type: "promotion",
            reason: reasonTexts[index],
          } satisfies IDiscussionBoardAdministratorAssignment.ICreate,
        },
      );
    typia.assert(assignment);
    return assignment;
  });
  // Test search with keyword "performance" (partial match, case-insensitive)
  const searchResult1 =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.index(
      superAdminConnection,
      {
        body: {
          search: "performance",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(searchResult1);
  // Should find assignment with "performance review"
  TestValidator.equals(
    "performance search returns matching assignment",
    searchResult1.data.length,
    1,
  );
  TestValidator.predicate(
    "performance search contains target assignment",
    searchResult1.data.some((item) =>
      item.reason?.toLowerCase().includes("performance"),
    ),
  );
  // Test search with keyword "leadership" (partial match)
  const searchResult2 =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.index(
      superAdminConnection,
      {
        body: {
          search: "leadership",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(searchResult2);
  // Should find assignment with "leadership qualities"
  TestValidator.equals(
    "leadership search returns matching assignment",
    searchResult2.data.length,
    1,
  );
  TestValidator.predicate(
    "leadership search contains target assignment",
    searchResult2.data.some((item) =>
      item.reason?.toLowerCase().includes("leadership"),
    ),
  );
  // Test search with keyword "skills" (partial match at end)
  const searchResult3 =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.index(
      superAdminConnection,
      {
        body: {
          search: "skills",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(searchResult3);
  // Should find assignment with "technical skills"
  TestValidator.equals(
    "skills search returns matching assignment",
    searchResult3.data.length,
    1,
  );
  TestValidator.predicate(
    "skills search contains target assignment",
    searchResult3.data.some((item) =>
      item.reason?.toLowerCase().includes("skills"),
    ),
  );
  // Test search with keyword "collaboration" (partial match at beginning)
  const searchResult4 =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.index(
      superAdminConnection,
      {
        body: {
          search: "collaboration",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(searchResult4);
  // Should find assignment with "team collaboration"
  TestValidator.equals(
    "collaboration search returns matching assignment",
    searchResult4.data.length,
    1,
  );
  TestValidator.predicate(
    "collaboration search contains target assignment",
    searchResult4.data.some((item) =>
      item.reason?.toLowerCase().includes("collaboration"),
    ),
  );
  // Test case-insensitive search
  const searchResult5 =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.index(
      superAdminConnection,
      {
        body: {
          search: "PERFORMANCE", // uppercase
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(searchResult5);
  // Should still find assignment with "performance review" (case-insensitive)
  TestValidator.equals(
    "uppercase search returns matching assignment",
    searchResult5.data.length,
    1,
  );
  // Test empty search parameter returns all assignments
  const allAssignments =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.index(
      superAdminConnection,
      {
        body: {
          search: "", // empty search
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(allAssignments);
  // Should return all created assignments (at least 4)
  TestValidator.predicate(
    "empty search returns all assignments",
    allAssignments.data.length >= 4,
  );
  // Test pagination with search filter
  const paginatedSearch =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.index(
      superAdminConnection,
      {
        body: {
          search: "review",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedSearch.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records count reflects search results",
    paginatedSearch.pagination.records >= 1,
  );
  // Test non-matching search returns empty results
  const nonMatchingSearch =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.index(
      superAdminConnection,
      {
        body: {
          search: "nonexistentkeyword",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(nonMatchingSearch);
  // Should return empty array for non-matching search
  TestValidator.equals(
    "non-matching search returns empty results",
    nonMatchingSearch.data.length,
    0,
  );
}
