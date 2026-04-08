import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_stop_creates_timelog(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates organization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  // 2. Create member and add as employee
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  // Add member as employee in organization
  const invitation = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: memberAuth.email,
        roleId: organization.owner.id,
        employmentType: "full-time",
      },
    },
  );
  // 3. Set organization context for member
  await generate_random_erp_hrm_member_organization_context_select(
    memberConnection,
    {
      body: {
        organizationId: organization.id,
      },
    },
  );
  // 4. Admin creates project and assigns member
  const project = typia.assert<(IErpHrmProject & IEntity) | undefined>(
    await generate_random_erp_hrm_admin_projects_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color: "#FF5733",
          status: "active",
        },
      },
    ),
  );
  if (!project) throw new Error("Failed to create project");
  
  // Use member auth ID for project assignment
  await generate_random_erp_hrm_admin_projects_members_create(adminConnection, {
    params: { projectId: project.id },
    body: {
      employeeId: memberAuth.id,
      assignedRole: "member",
    },
  });
  // 5. Start timer
  const timerDescription = RandomGenerator.paragraph({ sentences: 1 });
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        erpHrmProjectId: project.id,
        description: timerDescription,
      },
    },
  );
  typia.assert(timer);
  // Record start time for duration validation
  const startTime = new Date(timer.startedAt).getTime();
  // 6. Stop the timer (creates timelog)
  const timelog = await api.functional.erpHrm.member.timers.stop(
    memberConnection,
    {
      body: {} satisfies IErpHrmTimer.IStop,
    },
  );
  typia.assert(timelog);
  // 7. Validations
  // Duration is calculated from start to stop time, rounded to nearest minute
  const stopTime = new Date().getTime();
  const expectedDurationMinutes = Math.round((stopTime - startTime) / 60000);
  TestValidator.predicate(
    "duration within reasonable range",
    timelog.durationMinutes >= expectedDurationMinutes - 1 &&
      timelog.durationMinutes <= expectedDurationMinutes + 1,
  );
  // Timelog date is current date
  const today = new Date().toISOString().split("T")[0];
  TestValidator.equals(
    "timelog date is today",
    timelog.date.split("T")[0],
    today,
  );
  // Billable flag is true by default
  TestValidator.equals("billable flag true", timelog.billable, true);
  // Description matches timer description
  TestValidator.equals(
    "description matches timer",
    timelog.description,
    timerDescription,
  );
  // Employee reference exists
  TestValidator.predicate(
    "employee reference exists",
    timelog.employee !== undefined && timelog.employee !== null,
  );
  // Project reference matches timer's project
  TestValidator.equals(
    "project reference matches",
    timelog.project.id,
    project.id,
  );
}