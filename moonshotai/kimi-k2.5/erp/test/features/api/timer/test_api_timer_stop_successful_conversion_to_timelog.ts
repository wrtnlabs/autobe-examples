import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_stop_successful_conversion_to_timelog(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
    } satisfies DeepPartial<IErpHrmMember.IJoin>,
  });
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        } satisfies DeepPartial<IErpHrmOrganization.ICreate>,
      },
    );
  typia.assert(organization);
  // 3. Create role with permissions
  const role = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        permissions: [
          { permission: "project.manage" },
          { permission: "time.manage" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      } satisfies DeepPartial<IErpHrmRole.ICreate>,
    },
  );
  typia.assert(role);
  // 4. Create organization member record
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      memberConnection,
      {
        body: {
          organizationId: organization.id,
          userId: member.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies DeepPartial<IErpHrmOrganizationMember.ICreate>,
      },
    );
  typia.assert(organizationMember);
  // 5. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
      } satisfies DeepPartial<IErpHrmProject.ICreate>,
    },
  );
  typia.assert(project);
  // 6. Add member to project
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: organizationMember.id,
          role: "member",
        } satisfies DeepPartial<IErpHrmProjectMember.ICreate>,
      },
    );
  typia.assert(projectMember);
  // 7. Start timer without task
  const timerDescription = RandomGenerator.paragraph({ sentences: 2 });
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        taskId: null,
        description: timerDescription,
      } satisfies DeepPartial<IErpHrmTimer.ICreate>,
    },
  );
  typia.assert(timer);
  // Store timer start time for later validation
  const timerStartedAt = timer.startedAt;
  // 8. Wait briefly to ensure non-zero duration
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 9. Stop timer
  const timelog = await api.functional.erpHrm.member.timers.stop(
    memberConnection,
    {
      timerId: timer.id,
    },
  );
  typia.assert(timelog);
  // 10. Validate timelog response
  TestValidator.equals(
    "timelog project ID matches",
    timelog.project.id,
    project.id,
  );
  TestValidator.equals("timelog task is null", timelog.task, null);
  TestValidator.equals(
    "timelog description matches",
    timelog.description,
    timerDescription,
  );
  TestValidator.equals("timelog billable is true", timelog.billable, true);
  TestValidator.equals(
    "timelog startTime matches timer startedAt",
    timelog.startTime,
    timerStartedAt,
  );
  TestValidator.equals(
    "timelog organizationMember ID matches",
    timelog.organizationMember.id,
    organizationMember.id,
  );
  // Validate duration is greater than 0 (since we waited)
  TestValidator.predicate(
    "timelog durationMinutes is positive",
    timelog.durationMinutes > 0,
  );
  // Validate endTime is after startTime
  TestValidator.predicate(
    "timelog endTime is after startTime",
    new Date(timelog.endTime) > new Date(timelog.startTime),
  );
  // 11. Verify timer no longer exists by attempting to stop it again (should fail)
  await TestValidator.error(
    "timer should no longer exist after stopping",
    async () => {
      await api.functional.erpHrm.member.timers.stop(memberConnection, {
        timerId: timer.id,
      });
    },
  );
}
