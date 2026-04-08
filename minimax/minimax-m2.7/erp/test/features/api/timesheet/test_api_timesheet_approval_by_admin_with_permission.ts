import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_approval_by_admin_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and logs in
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const adminJoinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      displayName: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 2. Member joins and logs in
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass123!";
  const memberJoinConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 3. Generate timelogs for a work week (Monday to Sunday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysUntilMonday);
  monday.setHours(0, 0, 0, 0);
  // Create timelogs for Monday, Wednesday, Friday
  const mondayDate = new Date(monday);
  mondayDate.setHours(10, 0, 0, 0);
  const wednesdayDate = new Date(monday);
  wednesdayDate.setDate(monday.getDate() + 2);
  wednesdayDate.setHours(10, 0, 0, 0);
  const fridayDate = new Date(monday);
  fridayDate.setDate(monday.getDate() + 4);
  fridayDate.setHours(10, 0, 0, 0);
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: mondayDate.toISOString(),
        durationMinutes: 480,
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: wednesdayDate.toISOString(),
        durationMinutes: 480,
        billable: true,
      },
    },
  );
  typia.assert(timelog2);
  const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: fridayDate.toISOString(),
        durationMinutes: 480,
        billable: false,
      },
    },
  );
  typia.assert(timelog3);
  // 4. Create draft timesheet for the same week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: monday.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  TestValidator.equals(
    "timesheet status should be draft",
    timesheet.status,
    "draft",
  );
  TestValidator.predicate(
    "timesheet should have timelogs",
    timesheet.timesheetTimelogs.length > 0,
  );
  // 5. Submit the timesheet
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status should be submitted",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submittedAt should be set",
    submittedTimesheet.submittedAt !== null,
  );
  // 6. Admin approves the timesheet
  const approvedTimesheet =
    await api.functional.erpHrm.admin.timesheets.approve(adminConnection, {
      timesheetId: submittedTimesheet.id,
    });
  typia.assert(approvedTimesheet);
  // 7. Validate approval response
  TestValidator.equals(
    "timesheet status should be approved",
    approvedTimesheet.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewedAt should be recorded",
    approvedTimesheet.reviewedAt !== null,
  );
  TestValidator.predicate(
    "reviewerEmployee should be populated",
    approvedTimesheet.reviewerEmployee !== null,
  );
  TestValidator.notEquals(
    "reviewer employee should be different from timesheet owner",
    approvedTimesheet.reviewerEmployee!.id,
    approvedTimesheet.employee.id,
  );
  TestValidator.predicate(
    "all timelogs should be included",
    approvedTimesheet.timesheetTimelogs.length === 3,
  );
}
