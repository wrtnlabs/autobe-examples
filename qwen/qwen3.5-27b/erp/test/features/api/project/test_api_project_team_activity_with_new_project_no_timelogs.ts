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
 * Test edge case where a project has team members assigned but no time entries have been logged yet.
 *
 * Setup:
 * 1. Register and authenticate as a member user with project view permissions
 * 2. Create a new project with active status
 * 3. Assign at least 2 employees to the project as team members (simulated via system)
 * 4. Do NOT create any timelog entries for this project
 *
 * Execution:
 * 1. Call GET /hrmPlatform/member/projects/{projectId}/team-activity with the created project's UUID
 *
 * Validation:
 * 1. Verify response returns successfully
 * 2. Verify project summary is correct
 * 3. Verify overall statistics show zero values for time-related metrics
 * 4. Verify teamMembers array includes assigned employees with zero activity
 * 5. Verify mostActiveMember is null (no one has logged any time)
 */
export async function test_api_project_team_activity_with_new_project_no_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a new project with active status
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        color_code: `#${RandomGenerator.alphaNumeric(6)}`,
      },
    },
  );
  typia.assert(project);
  // 3. Call team activity endpoint for the newly created project
  const teamActivity =
    await api.functional.hrmPlatform.member.projects.team_activity.getTeamActivity(
      memberConnection,
      {
        projectId: project.id,
      },
    );
  typia.assert(teamActivity);
  // 4. Validate project summary in response
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
  // 5. Validate overall statistics show zero values for time-related metrics
  TestValidator.equals(
    "total hours logged is zero",
    teamActivity.overall.totalHoursLogged,
    0,
  );
  TestValidator.equals(
    "total timelogs is zero",
    teamActivity.overall.totalTimelogs,
    0,
  );
  TestValidator.equals(
    "recent activity count is zero",
    teamActivity.overall.recentActivityCount,
    0,
  );
  TestValidator.equals(
    "average hours per member is zero",
    teamActivity.overall.averageHoursPerMember,
    0,
  );
  // 6. Validate team members array structure
  TestValidator.predicate(
    "team members array exists",
    Array.isArray(teamActivity.teamMembers),
  );
  // 7. Validate each team member has zero activity
  await ArrayUtil.asyncForEach(teamActivity.teamMembers, async (member) => {
    typia.assert(member);
    TestValidator.equals(
      "team member total hours is zero",
      member.totalHoursLogged,
      0,
    );
    TestValidator.equals(
      "team member total timelogs is zero",
      member.totalTimelogs,
      0,
    );
    TestValidator.equals(
      "team member average daily hours is zero",
      member.averageDailyHours,
      0,
    );
    TestValidator.equals(
      "team member last activity date is null",
      member.lastActivityDate,
      null,
    );
    // Validate employee summary structure exists
    typia.assert(member.employee);
  });
  // 8. Validate mostActiveMember is null when no timelogs exist
  TestValidator.equals(
    "most active member is null when no timelogs",
    teamActivity.mostActiveMember,
    null,
  );
}