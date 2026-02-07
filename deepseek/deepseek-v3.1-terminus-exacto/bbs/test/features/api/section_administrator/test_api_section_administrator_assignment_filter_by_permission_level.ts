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
 * Test filtering section administrator assignments by permission level.
 *
 * This test validates that the section administrator assignment search endpoint
 * correctly handles permission level filtering. Since assignment creation endpoints
 * are not available, this test focuses on testing the search functionality with
 * various permission level filters to ensure proper handling of the filter parameter.
 */
export async function test_api_section_administrator_assignment_filter_by_permission_level(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as super administrator
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create a section ID for testing
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Test searching with different permission level filters
  const permissionLevels = ["admin", "moderator", "viewer"] as const;
  for (const permissionLevel of permissionLevels) {
    // Use the search endpoint with specific permission level filter
    const searchResult =
      await api.functional.discussionBoard.superAdmin.sections.assignments.index(
        superAdminConnection,
        {
          sectionId,
          body: {
            permission_level: permissionLevel,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardSectionAdministrator.IRequest,
        },
      );
    typia.assert(searchResult);
    // Validate pagination structure
    TestValidator.predicate(
      `search result should have valid pagination for permission level ${permissionLevel}`,
      searchResult.pagination.records >= 0 &&
        searchResult.pagination.pages >= 0,
    );
    // Validate that all returned assignments (if any) match the filter
    if (searchResult.data.length > 0) {
      TestValidator.predicate(
        `all assignments should match permission level ${permissionLevel}`,
        searchResult.data.every(
          (assignment) => assignment.permission_level === permissionLevel,
        ),
      );
    }
  }
  // Test searching without permission level filter (should return all assignments)
  const allAssignments =
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
  typia.assert(allAssignments);
  // Validate pagination structure for unfiltered search
  TestValidator.predicate(
    "unfiltered search should have valid pagination",
    allAssignments.pagination.records >= 0 &&
      allAssignments.pagination.pages >= 0,
  );
}
