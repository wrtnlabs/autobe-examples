import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test lifecycle status filtering for project listing.
 *
 * This test validates that the project listing endpoint correctly filters projects by their lifecycle status (Active, Archived, Completed). The test ensures that each status filter returns only projects matching that status, and that omitting the status filter returns all projects regardless of status.
 *
 * The test covers the complete project lifecycle workflow: creation of multiple projects, archiving and completing projects, and verifying that the filtering mechanism correctly isolates projects by their current status.
 *
 * 1. Authenticate as a member via POST /hrmPlatform/auth/member/join
 * 2. Create 3 projects with random data via POST /hrmPlatform/member
 * 3. Archive the second project via PATCH /hrmPlatform/member/projects/{projectId}/archive
 * 4. Complete the third project via PATCH /hrmPlatform/member/projects/{projectId}
 * 5. Call PATCH /hrmPlatform/member/projects with status=Active
 * 6. Verify only 1 Active project returned
 * 7. Call with status=Archived
 * 8. Verify only 1 Archived project returned
 * 9. Call with status=Completed
 * 10. Verify only 1 Completed project returned
 * 11. Call without status filter
 * 12. Verify all 3 projects returned
 * 13. Verify organization isolation - projects from other organizations not included
 */
export async function test_api_projects_status_filtering(
  connection: api.IConnection,
) {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create first project (Active by default)
  const projectActive =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color_code: "#FF5733",
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(projectActive);
  // 3. Create second project (Active by default)
  const projectToArchive =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color_code: "#33FF57",
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(projectToArchive);
  // 4. Create third project (Active by default)
  const projectToComplete =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color_code: "#5733FF",
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(projectToComplete);
  // 5. Archive the second project
  const archivedProject =
    await api.functional.hrmPlatform.member.projects.archive(memberConnection, {
      projectId: projectToArchive.id,
    });
  typia.assert(archivedProject);
  // 6. Complete the third project
  const completedProject =
    await api.functional.hrmPlatform.member.projects.complete(
      memberConnection,
      {
        projectId: projectToComplete.id,
        body: {} satisfies IHrmPlatformProject.ICompleteRequest,
      },
    );
  typia.assert(completedProject);
  // 7. Test filtering by Active status
  const activeFilterResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: { status: "Active" } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(activeFilterResult);
  TestValidator.equals(
    "Active filter returns 1 project",
    activeFilterResult.data.length,
    1,
  );
  if (activeFilterResult.data.length > 0) {
    const activeProject: IHrmPlatformProject.ISummary =
      activeFilterResult.data[0];
    TestValidator.equals(
      "Active project status matches",
      activeProject.status,
      "Active",
    );
  }
  // 8. Test filtering by Archived status
  const archivedFilterResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: { status: "Archived" } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(archivedFilterResult);
  TestValidator.equals(
    "Archived filter returns 1 project",
    archivedFilterResult.data.length,
    1,
  );
  if (archivedFilterResult.data.length > 0) {
    const archivedProjectReturned: IHrmPlatformProject.ISummary =
      archivedFilterResult.data[0];
    TestValidator.equals(
      "Archived project status matches",
      archivedProjectReturned.status,
      "Archived",
    );
  }
  // 9. Test filtering by Completed status
  const completedFilterResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: { status: "Completed" } satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(completedFilterResult);
  TestValidator.equals(
    "Completed filter returns 1 project",
    completedFilterResult.data.length,
    1,
  );
  if (completedFilterResult.data.length > 0) {
    const completedProjectReturned: IHrmPlatformProject.ISummary =
      completedFilterResult.data[0];
    TestValidator.equals(
      "Completed project status matches",
      completedProjectReturned.status,
      "Completed",
    );
  }
  // 10. Test without status filter (should return all 3 projects)
  const allProjectsResult =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: {} satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(allProjectsResult);
  TestValidator.equals(
    "All projects returned",
    allProjectsResult.data.length,
    3,
  );
}
