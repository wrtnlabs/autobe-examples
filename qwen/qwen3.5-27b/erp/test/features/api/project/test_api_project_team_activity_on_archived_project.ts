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
 * Test that team activity statistics are still available for archived projects,
 * providing historical visibility into past project work.
 */
export async function test_api_project_team_activity_on_archived_project(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create an archived project directly
  const archivedProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "archived",
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
          budget_hours: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<40> & tags.Maximum<200>
          >(),
        },
      },
    );
  typia.assert(archivedProject);
  // 3. Call team activity endpoint for the archived project
  const teamActivity =
    await api.functional.hrmPlatform.member.projects.team_activity.getTeamActivity(
      memberConnection,
      {
        projectId: archivedProject.id,
      },
    );
  typia.assert(teamActivity);
  // 4. Validate response structure
  TestValidator.equals(
    "project status is archived",
    teamActivity.project.status,
    "archived",
  );
  TestValidator.equals(
    "project ID matches",
    teamActivity.project.id,
    archivedProject.id,
  );
  // 5. Validate overall statistics structure
  TestValidator.predicate(
    "totalHoursLogged is non-negative",
    teamActivity.overall.totalHoursLogged >= 0,
  );
  TestValidator.predicate(
    "totalTimelogs is non-negative",
    teamActivity.overall.totalTimelogs >= 0,
  );
  TestValidator.predicate(
    "activeTeamMembersCount is non-negative",
    teamActivity.overall.activeTeamMembersCount >= 0,
  );
  TestValidator.predicate(
    "averageHoursPerMember is non-negative",
    teamActivity.overall.averageHoursPerMember >= 0,
  );
  TestValidator.predicate(
    "recentActivityCount is non-negative",
    teamActivity.overall.recentActivityCount >= 0,
  );
  // 6. Validate teamMembers array structure
  TestValidator.predicate(
    "teamMembers is an array",
    Array.isArray(teamActivity.teamMembers),
  );
  // 7. Validate teamMembers element structure when array is not empty
  if (teamActivity.teamMembers.length > 0) {
    const firstMember = teamActivity.teamMembers[0];
    TestValidator.predicate(
      "team member has employee",
      firstMember.employee !== undefined,
    );
    TestValidator.predicate(
      "team member totalHoursLogged is non-negative",
      firstMember.totalHoursLogged >= 0,
    );
    TestValidator.predicate(
      "team member totalTimelogs is non-negative",
      firstMember.totalTimelogs >= 0,
    );
    TestValidator.predicate(
      "team member averageDailyHours is non-negative",
      firstMember.averageDailyHours >= 0,
    );
  }
  // 8. Validate mostActiveMember structure (can be null for new projects)
  if (teamActivity.mostActiveMember !== null) {
    TestValidator.predicate(
      "mostActiveMember has employee",
      teamActivity.mostActiveMember.employee !== undefined,
    );
    TestValidator.predicate(
      "mostActiveMember has totalHoursLogged",
      teamActivity.mostActiveMember.totalHoursLogged >= 0,
    );
    TestValidator.predicate(
      "mostActiveMember has totalTimelogs",
      teamActivity.mostActiveMember.totalTimelogs >= 0,
    );
  }
}
