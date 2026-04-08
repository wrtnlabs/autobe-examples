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
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timelog_deletion_prevented_when_in_approved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates organization account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) + "!1Aa",
      displayName: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // 2. Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) + "!1Aa",
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // 3. Admin creates a project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color: "#4A90E2",
        status: "active",
      },
    },
  );
  // 4. Admin assigns member to project
  await api.functional.erpHrm.admin.projects.members.create(adminConnection, {
    projectId: (project as any).id,
    body: {
      employeeId: (
        memberConnection.headers?.Authorization as string | undefined
      )?.split(" ")[1] as string & tags.Format<"uuid">,
      assignedRole: "member",
    } satisfies IErpHrmProjectMember.ICreate,
  });
  // 5. Member creates a timelog
  const memberLoggedInConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoggedInConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) + "!1Aa",
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // Get a date for the timelog (yesterday)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(10, 0, 0, 0);
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberLoggedInConnection,
    {
      body: {
        projectId: (project as any).id,
        date: yesterday.toISOString(),
        durationMinutes: 120,
        description: "Test work session",
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 6. Member creates a draft timesheet for the week containing the timelog
  // Calculate Monday of the week containing the timelog
  const timelogDate = new Date(timelog.date);
  const dayOfWeek = timelogDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekMonday = new Date(timelogDate);
  weekMonday.setDate(timelogDate.getDate() + mondayOffset);
  weekMonday.setHours(0, 0, 0, 0);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberLoggedInConnection,
    {
      body: {
        weekStartDate: weekMonday.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 7. Member submits the timesheet (timesheet is now submitted, timelog is locked)
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(
      memberLoggedInConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  // 8. Member attempts to delete the timelog - should fail because it's in a submitted/approved timesheet
  await TestValidator.error(
    "timelog deletion should fail when in submitted timesheet",
    async () => {
      await api.functional.erpHrm.member.timelogs.erase(
        memberLoggedInConnection,
        {
          timelogId: timelog.id,
        },
      );
    },
  );
}