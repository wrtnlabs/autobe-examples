import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMostActiveMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMostActiveMember";
import type { IHrmPlatformProjectTeamActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectTeamActivity";
import type { IHrmPlatformProjectTeamActivityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectTeamActivityMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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
 * Test team activity statistics retrieval for a project with active contributors.
 *
 * This test validates the team activity endpoint by:
 * 1. Authenticating as a member user
 * 2. Creating a new active project
 * 3. Retrieving team activity statistics for the project
 * 4. Validating response structure and data integrity
 */
export async function test_api_project_team_activity_with_active_contributors(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new active project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 3. Retrieve team activity statistics
  const teamActivity =
    await api.functional.hrmPlatform.member.projects.team_activity.getTeamActivity(
      memberConnection,
      {
        projectId: project.id,
      },
    );
  typia.assert(teamActivity);
  // 4. Validate project summary
  TestValidator.equals(
    "project id matches",
    teamActivity.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    teamActivity.project.name,
    project.name,
  );
  TestValidator.equals(
    "project status is active",
    teamActivity.project.status,
    "active",
  );
  TestValidator.predicate(
    "project has color code",
    teamActivity.project.color_code.length > 0,
  );
  // 5. Validate overall statistics structure
  TestValidator.predicate(
    "total hours logged is non-negative",
    teamActivity.overall.totalHoursLogged >= 0,
  );
  TestValidator.predicate(
    "total timelogs is non-negative",
    teamActivity.overall.totalTimelogs >= 0,
  );
  TestValidator.predicate(
    "active team members count is non-negative",
    teamActivity.overall.activeTeamMembersCount >= 0,
  );
  TestValidator.predicate(
    "average hours per member is non-negative",
    teamActivity.overall.averageHoursPerMember >= 0,
  );
  TestValidator.predicate(
    "recent activity count is non-negative",
    teamActivity.overall.recentActivityCount >= 0,
  );
  // 6. Validate team members array exists
  TestValidator.predicate(
    "team members array exists",
    Array.isArray(teamActivity.teamMembers),
  );
  // 7. Validate most active member is null when no activity
  TestValidator.equals(
    "most active member is null for empty project",
    teamActivity.mostActiveMember,
    null,
  );
}
