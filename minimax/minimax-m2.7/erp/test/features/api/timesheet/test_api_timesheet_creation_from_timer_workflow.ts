import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
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
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_creation_from_timer_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Admin account and create project
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  const project = typia.assert<IErpHrmProject & { id: string }>(
    await generate_random_erp_hrm_admin_projects_create(adminConnection, {}),
  );
  // 2. Create member account and get credentials
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberAuth = await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(memberAuth);
  // 3. Login as member (the connection from join already has token, but login gives us proper session)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Admin assigns member to project using member's user ID
  // Note: In this system, member ID from auth is the erp_hrm_employee_id for project membership
  await generate_random_erp_hrm_admin_projects_members_create(adminConnection, {
    params: { projectId: project.id },
    body: {
      employeeId: memberAuth.id,
      assignedRole: "member",
    },
  });
  // 5. Start timer for the member
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        erpHrmProjectId: project.id,
        description: "Test timer for timesheet workflow",
      },
    },
  );
  typia.assert(timer);
  // 6. Wait for timer to accumulate some time
  await new Promise((resolve) => setTimeout(resolve, 2000));
  // 7. Stop timer to auto-create timelog
  const timelog = await api.functional.erpHrm.member.timers.stop(
    memberConnection,
    {
      body: {
        discard: false,
      },
    },
  );
  typia.assert(timelog);
  // 8. Calculate Monday (week start date) from timelog date
  const timelogDate = new Date(timelog.date);
  const dayOfWeek = timelogDate.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(timelogDate);
  monday.setUTCDate(timelogDate.getUTCDate() - daysToMonday);
  const weekStartDate = monday.toISOString();
  // 9. Create draft timesheet for the week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: weekStartDate as string & tags.Format<"date-time">,
      },
    },
  );
  typia.assert(timesheet);
  // 10. Validations
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  TestValidator.predicate(
    "totalHours greater than 0",
    timesheet.totalHours > 0,
  );
  TestValidator.equals(
    "timesheet includes the timelog",
    timesheet.timesheetTimelogs.length > 0,
    true,
  );
  // Verify timelog details in timesheet
  const includedTimelog = timesheet.timesheetTimelogs[0]?.timelog;
  TestValidator.equals(
    "timelog project matches",
    includedTimelog?.project?.id,
    project.id,
  );
  TestValidator.equals(
    "timelog has positive duration",
    (includedTimelog?.durationMinutes ?? 0) > 0,
    true,
  );
}