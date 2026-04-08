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
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates organization context
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Member joins the system
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 3. Admin sets organization context
  const adminOrgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      adminConnection,
      {},
    );
  const organizationId = adminOrgContext.organization.id;
  // 4. Member sets organization context (same organization)
  await generate_random_erp_hrm_member_organization_context_select(
    memberConnection,
    {
      body: { organizationId },
    },
  );
  // 5. Admin creates a project for time tracking
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  // Access the first project from the items array
  const projectEntry = project.items[0];
  // 6. Member creates timelogs for a specific week (Monday to Sunday)
  // Calculate a Monday date for the timesheet week
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  // Create timelogs for Monday, Wednesday, Friday of the same week
  const timelogDates = [
    new Date(monday),
    new Date(monday.getTime() + 2 * 24 * 60 * 60 * 1000), // Wednesday
    new Date(monday.getTime() + 4 * 24 * 60 * 60 * 1000), // Friday
  ];
  const timelogs: IErpHrmTimelog[] = [];
  for (const timelogDate of timelogDates) {
    const timelog = await generate_random_erp_hrm_member_timelogs_create(
      memberConnection,
      {
        body: {
          projectId: projectEntry.projectId,
          date: timelogDate.toISOString(),
          durationMinutes: 480, // 8 hours
          description: "Regular work day",
          billable: true,
        },
      },
    );
    typia.assert(timelog);
    timelogs.push(timelog);
  }
  // 7. Member creates a draft timesheet for that week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: monday.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 8. Call GET /erpHrm/member/timesheets/{timesheetId} with the owned timesheet's ID
  const retrievedTimesheet = await api.functional.erpHrm.member.timesheets.at(
    memberConnection,
    { timesheetId: timesheet.id },
  );
  typia.assert(retrievedTimesheet);
  // 9. Validate the retrieved timesheet
  TestValidator.equals(
    "timesheet ID matches",
    retrievedTimesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "week start date matches",
    retrievedTimesheet.weekStartDate,
    timesheet.weekStartDate,
  );
  TestValidator.equals(
    "week end date matches",
    retrievedTimesheet.weekEndDate,
    timesheet.weekEndDate,
  );
  TestValidator.equals("status is draft", retrievedTimesheet.status, "draft");
  TestValidator.predicate("total hours > 0", retrievedTimesheet.totalHours > 0);
  // Validate employee details
  TestValidator.equals(
    "employee ID matches",
    retrievedTimesheet.employee.id,
    member.id,
  );
  TestValidator.equals(
    "employee name matches",
    retrievedTimesheet.employee.member.displayName,
    member.displayName,
  );
  // Validate timelogs are included
  TestValidator.predicate(
    "has timelogs",
    retrievedTimesheet.timesheetTimelogs.length > 0,
  );
  TestValidator.equals(
    "timelog count matches",
    retrievedTimesheet.timesheetTimelogs.length,
    3,
  );
  // For draft status: reviewer should be null, rejection reason should be null
  TestValidator.equals(
    "reviewer is null for draft",
    retrievedTimesheet.reviewerEmployee,
    null,
  );
  TestValidator.equals(
    "rejection reason is null for draft",
    retrievedTimesheet.rejectionReason,
    null,
  );
  // Validate first timelog details
  const firstTimelog = retrievedTimesheet.timesheetTimelogs[0];
  TestValidator.equals(
    "timelog has valid ID",
    firstTimelog.timelog.id,
    timelogs[0].id,
  );
  TestValidator.equals(
    "timelog duration matches",
    firstTimelog.timelog.durationMinutes,
    480,
  );
  TestValidator.equals(
    "timelog is billable",
    firstTimelog.timelog.billable,
    true,
  );
}
