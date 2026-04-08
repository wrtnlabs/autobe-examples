import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmWeeklySummary";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmWeeklySummary";
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
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_weekly_summary_multi_week_aggregation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      displayName: "Test Admin",
    },
  });
  typia.assert(adminAuth);
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Create project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: "Test Project",
        color: "#4A90E2",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 4. Create member who will be employee
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Test1234!";
  // Join as member
  const memberJoinConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: "Test Employee",
    },
  });
  // 5. Login as member to get session for timelogging
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost",
      referrer: "http://localhost",
    },
  });
  // Helper to create date string at midnight UTC
  const toDateString = (date: Date): string => {
    return date.toISOString().split("T")[0] + "T00:00:00.000Z";
  };
  // Week 1: Mon Mar 23 - Sun Mar 29, 2026
  // Create timelogs: Mon(10h) + Wed(10h) + Fri(10h) + Sat(5h) + Sun(5h) = 40 hours total
  const week1Dates = [
    { date: new Date("2026-03-23T00:00:00.000Z"), minutes: 600 },
    { date: new Date("2026-03-25T00:00:00.000Z"), minutes: 600 },
    { date: new Date("2026-03-27T00:00:00.000Z"), minutes: 600 },
    { date: new Date("2026-03-28T00:00:00.000Z"), minutes: 300 },
    { date: new Date("2026-03-29T00:00:00.000Z"), minutes: 300 },
  ];
  // Week 2: Mon Mar 30 - Sun Apr 5, 2026
  // Create timelogs: Tue(4h) + Thu(8h) + Fri(8h) = 20 hours total
  const week2Dates = [
    { date: new Date("2026-03-31T00:00:00.000Z"), minutes: 240 },
    { date: new Date("2026-04-02T00:00:00.000Z"), minutes: 480 },
    { date: new Date("2026-04-03T00:00:00.000Z"), minutes: 480 },
  ];
  // 6. Create timelogs for Week 1
  const week1Timelogs = await ArrayUtil.asyncMap(week1Dates, async (entry) => {
    const timelog = await generate_random_erp_hrm_member_timelogs_create(
      memberConnection,
      {
        body: {
          projectId: (project as IErpHrmProject & { id: string }).id,
          date: toDateString(entry.date),
          durationMinutes: entry.minutes,
        },
      },
    );
    typia.assert(timelog);
    return timelog;
  });
  // 7. Create timelogs for Week 2
  const week2Timelogs = await ArrayUtil.asyncMap(week2Dates, async (entry) => {
    const timelog = await generate_random_erp_hrm_member_timelogs_create(
      memberConnection,
      {
        body: {
          projectId: (project as IErpHrmProject & { id: string }).id,
          date: toDateString(entry.date),
          durationMinutes: entry.minutes,
        },
      },
    );
    typia.assert(timelog);
    return timelog;
  });
  // 8. Call weekly summary endpoint
  const summary =
    await api.functional.erpHrm.admin.analytics.weekly_summary.index(
      adminConnection,
      {
        body: {
          startDate: "2026-03-23",
          endDate: "2026-04-05",
        },
      },
    );
  typia.assert(summary);
  // 9. Validate response
  TestValidator.equals("records count", summary.data.length, 2);
  TestValidator.equals("pagination records", summary.pagination.records, 2);
  // Week 1 validation (totalHours=40, timelogsCount=5, employeesCount=1)
  const week1 = summary.data[0];
  TestValidator.equals(
    "week1 weekStartDate",
    week1.weekStartDate,
    "2026-03-23",
  );
  TestValidator.equals("week1 weekEndDate", week1.weekEndDate, "2026-03-29");
  TestValidator.equals("week1 totalHours", week1.totalHours, 40);
  TestValidator.equals("week1 timelogsCount", week1.timelogsCount, 5);
  TestValidator.equals("week1 employeesCount", week1.employeesCount, 1);
  // Week 2 validation (totalHours=20, timelogsCount=3, employeesCount=1)
  const week2 = summary.data[1];
  TestValidator.equals(
    "week2 weekStartDate",
    week2.weekStartDate,
    "2026-03-30",
  );
  TestValidator.equals("week2 weekEndDate", week2.weekEndDate, "2026-04-05");
  TestValidator.equals("week2 totalHours", week2.totalHours, 20);
  TestValidator.equals("week2 timelogsCount", week2.timelogsCount, 3);
  TestValidator.equals("week2 employeesCount", week2.employeesCount, 1);
  // Verify ordering
  TestValidator.predicate(
    "weeks ordered by startDate",
    week1.weekStartDate < week2.weekStartDate,
  );
}