import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_approval_by_manager_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member account (timesheet owner/employee)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeAuth);
  // Step 2: Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    employeeConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#3A86FF" as string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active",
      },
    },
  );
  typia.assert(project);
  // Step 3: Create a timelog
  const timelogDate = new Date();
  timelogDate.setDate(timelogDate.getDate() - 3);
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        projectId: project.id,
        date: timelogDate.toISOString(),
        durationMinutes: 240,
      },
    },
  );
  typia.assert(timelog);
  // Step 4: Create a draft timesheet covering current week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    {
      body: {
        week_start_date: weekStart.toISOString(),
        week_end_date: weekEnd.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Step 5: Add timelog to timesheet
  const timesheetWithTimelog =
    await api.functional.erpHrm.member.timesheets.timelogs.add(
      employeeConnection,
      {
        timesheetId: timesheet.id,
        body: {
          erp_hrm_timelog_id: timelog.id,
        },
      },
    );
  typia.assert(timesheetWithTimelog);
  // Step 6: Submit the timesheet
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(employeeConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "submitted status",
    submittedTimesheet.status,
    "submitted",
  );
  // Step 7: Create second member account (manager approver)
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(managerAuth);
  // Step 8: Approve the submitted timesheet
  const approvedTimesheet =
    await api.functional.erpHrm.member.timesheets.approve(managerConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(approvedTimesheet);
  // Validations
  TestValidator.equals(
    "status is approved",
    approvedTimesheet.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewed_at is recorded",
    approvedTimesheet.reviewed_at !== null &&
      approvedTimesheet.reviewed_at !== undefined,
  );
  TestValidator.predicate(
    "reviewerEmployee is present",
    approvedTimesheet.reviewerEmployee !== null,
  );
  TestValidator.predicate(
    "total_hours is positive",
    approvedTimesheet.total_hours > 0,
  );
}
