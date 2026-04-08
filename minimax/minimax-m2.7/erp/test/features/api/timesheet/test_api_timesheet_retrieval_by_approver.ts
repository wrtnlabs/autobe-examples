import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
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
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_retrieval_by_approver(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates organization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create manager role with time:approve permission
  const managerRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: `Manager ${RandomGenerator.alphabets(8)}`,
        permissions: [
          "time:approve",
          "time:view_all",
          "employee:view",
        ] as const,
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(managerRole);
  // Get organization ID from the manager role
  const organizationId = managerRole.organization.id;
  // 3. Create employee user and set organization context
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(employeeAuth);
  // Set employee organization context
  await generate_random_erp_hrm_member_organization_context_select(
    employeeConnection,
    {
      body: {
        organizationId: organizationId,
      } satisfies IErpHrmOrganizationContext.ICreate,
    },
  );
  // 4. Create manager user and set organization context
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(managerAuth);
  // Set manager organization context
  await generate_random_erp_hrm_member_organization_context_select(
    managerConnection,
    {
      body: {
        organizationId: organizationId,
      } satisfies IErpHrmOrganizationContext.ICreate,
    },
  );
  // 5. Create project (IErpHrmProject is a budget report type with items array)
  const projectReport = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#4A90E2",
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(projectReport);
  // Get project ID from the budget report items
  const projectId = projectReport.items[0].projectId;
  // 6. Create timelogs for the employee
  const getMonday = (d: Date): Date => {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };
  const mondayDate = getMonday(new Date());
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        projectId: projectId,
        date: mondayDate.toISOString(),
        durationMinutes: 120,
        description: RandomGenerator.paragraph({ sentences: 1 }),
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 7. Create and submit timesheet
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    {
      body: {
        weekStartDate: mondayDate.toISOString(),
      } satisfies IErpHrmTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // Submit the timesheet
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(employeeConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  // 8. Manager retrieves the submitted timesheet (main test endpoint)
  const retrievedTimesheet = await api.functional.erpHrm.member.timesheets.at(
    managerConnection,
    {
      timesheetId: submittedTimesheet.id,
    },
  );
  typia.assert(retrievedTimesheet);
  // Validate retrieved timesheet
  TestValidator.equals(
    "timesheet status is submitted",
    retrievedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "timesheet has employee details",
    !!retrievedTimesheet.employee,
  );
  TestValidator.predicate(
    "timesheet has timelogs",
    retrievedTimesheet.timesheetTimelogs.length > 0,
  );
  TestValidator.equals(
    "no reviewer yet (pending approval)",
    retrievedTimesheet.reviewerEmployee,
    null,
  );
  TestValidator.equals(
    "no rejection reason",
    retrievedTimesheet.rejectionReason,
    null,
  );
  TestValidator.equals(
    "timesheet ID matches",
    retrievedTimesheet.id,
    submittedTimesheet.id,
  );
}
