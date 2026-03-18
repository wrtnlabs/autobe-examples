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
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
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
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_employee_updates_own_timelog(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create role
  const role = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        permissions: [],
      },
    },
  );
  typia.assert(role);
  // 4. Create organization member for the authenticated user
  const orgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      memberConnection,
      {
        body: {
          organizationId: organization.id,
          userId: member.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  typia.assert(orgMember);
  // 5. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 6. Assign organization member to project
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          organizationMemberId: orgMember.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 7. Create initial timelog (not assigned to any timesheet)
  const startTime = new Date();
  startTime.setHours(9, 0, 0, 0);
  const endTime = new Date();
  endTime.setHours(17, 0, 0, 0);
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        description: "Initial work session",
        billable: false,
      },
    },
  );
  typia.assert(timelog);
  // Verify timelog is not in any timesheet (null check)
  TestValidator.equals("timelog not in timesheet", timelog.timesheet, null);
  // 8. Update timelog
  const newStartTime = new Date();
  newStartTime.setHours(8, 30, 0, 0);
  const newEndTime = new Date();
  newEndTime.setHours(16, 30, 0, 0);
  const updatedTimelog = await api.functional.erpHrm.member.timelogs.update(
    memberConnection,
    {
      timelogId: timelog.id,
      body: {
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
        description: "Updated work session description",
        billable: true,
        projectId: project.id,
      } satisfies IErpHrmTimelog.IUpdate,
    },
  );
  typia.assert(updatedTimelog);
  // 9. Validate results
  const expectedDurationMinutes = Math.round(
    (newEndTime.getTime() - newStartTime.getTime()) / (1000 * 60),
  );
  TestValidator.equals(
    "duration recalculated correctly",
    updatedTimelog.durationMinutes,
    expectedDurationMinutes,
  );
  TestValidator.equals(
    "start time updated",
    updatedTimelog.startTime,
    newStartTime.toISOString(),
  );
  TestValidator.equals(
    "end time updated",
    updatedTimelog.endTime,
    newEndTime.toISOString(),
  );
  TestValidator.equals(
    "description updated",
    updatedTimelog.description,
    "Updated work session description",
  );
  TestValidator.equals("billable updated", updatedTimelog.billable, true);
  TestValidator.equals(
    "organization member preserved",
    updatedTimelog.organizationMember.id,
    orgMember.id,
  );
  TestValidator.equals(
    "project preserved",
    updatedTimelog.project.id,
    project.id,
  );
  TestValidator.predicate(
    "updatedAt is newer than createdAt",
    new Date(updatedTimelog.updatedAt) > new Date(updatedTimelog.createdAt),
  );
}
