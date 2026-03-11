import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorAssignmentToMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignmentToMember";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorAssignmentToMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorAssignmentToMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_administrator_assignments_to_members_search(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorizedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(authorizedSuperAdmin);
  // Test basic search with pagination
  const basicSearchResult =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_members.index(
      superAdminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardAdministratorAssignmentToMember.IRequest,
      },
    );
  typia.assert(basicSearchResult);
  // Test search with assignment type filter
  const assignmentTypeSearchResult =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_members.index(
      superAdminConnection,
      {
        body: {
          assignment_type: "promotion",
        } satisfies IDiscussionBoardAdministratorAssignmentToMember.IRequest,
      },
    );
  typia.assert(assignmentTypeSearchResult);
  // Test search with role transition filters
  const roleTransitionSearchResult =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_members.index(
      superAdminConnection,
      {
        body: {
          old_role: "member",
          new_role: "admin",
        } satisfies IDiscussionBoardAdministratorAssignmentToMember.IRequest,
      },
    );
  typia.assert(roleTransitionSearchResult);
  // Test search with date range filters
  const dateRangeSearchResult =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.to_members.index(
      superAdminConnection,
      {
        body: {
          start_date: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: new Date().toISOString(),
        } satisfies IDiscussionBoardAdministratorAssignmentToMember.IRequest,
      },
    );
  typia.assert(dateRangeSearchResult);
  // Validate business logic for assignments targeting members
  if (basicSearchResult.data.length > 0) {
    const assignment = basicSearchResult.data[0];
    // Business logic validation: assignments targeting members should have member as recipient
    TestValidator.equals(
      "assignment member should have valid structure",
      typeof assignment.member.display_name,
      "string",
    );
  }
}
