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

export async function test_api_weekly_summary_project_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Create Project A (target project for filter)
  const projectA = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: "Project Alpha",
        color: "#FF5733",
        description: "First project for filter test",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(projectA);
  const projectAId = (projectA as IErpHrmProject & { id: string }).id;
  // 4. Create Project B (should be excluded by filter)
  const projectB = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: "Project Beta",
        color: "#4A90E2",
        description: "Second project for comparison",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(projectB);
  const projectBId = (projectB as IErpHrmProject & { id: string }).id;
  // 5. Create member user
  const memberConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 6. Create employee from member
  const invitation = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: member.email,
        roleId: organization.owner.id,
        employmentType: "full-time",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  typia.assert(invitation);
  // 7. Create timelogs for Week 1 (Monday to Sunday)
  // Get Monday of current week
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const tuesday = new Date(monday);
  tuesday.setDate(monday.getDate() + 1);
  const wednesday = new Date(monday);
  wednesday.setDate(monday.getDate() + 2);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const mondayStr = monday.toISOString().split("T")[0];
  const tuesdayStr = tuesday.toISOString().split("T")[0];
  const wednesdayStr = wednesday.toISOString().split("T")[0];
  const sundayStr = sunday.toISOString().split("T")[0];
  // Create timelogs on Project A: 10 hours total (600 minutes)
  const timelogA1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectAId,
        date: mondayStr + "T00:00:00.000Z",
        durationMinutes: 300, // 5 hours
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelogA1);
  const timelogA2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectAId,
        date: tuesdayStr + "T00:00:00.000Z",
        durationMinutes: 300, // 5 hours
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelogA2);
  // Create timelogs on Project B: 15 hours total (900 minutes) - should be excluded
  const timelogB1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectBId,
        date: mondayStr + "T00:00:00.000Z",
        durationMinutes: 450, // 7.5 hours
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelogB1);
  const timelogB2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectBId,
        date: wednesdayStr + "T00:00:00.000Z",
        durationMinutes: 450, // 7.5 hours
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelogB2);
  // 8. Call weekly summary with project filter
  const weeklySummary =
    await api.functional.erpHrm.admin.analytics.weekly_summary.index(
      adminConnection,
      {
        body: {
          startDate: mondayStr,
          endDate: sundayStr,
          projectId: projectAId,
        } satisfies IErpHrmWeeklySummary.IRequest,
      },
    );
  typia.assert(weeklySummary);
  // 9. Validate response
  TestValidator.equals(
    "data has exactly 1 weekly summary",
    weeklySummary.data.length,
    1,
  );
  TestValidator.equals(
    "total hours only Project A (10 hours)",
    weeklySummary.data[0].totalHours,
    10,
  );
  TestValidator.equals(
    "timelogsCount only Project A entries (2)",
    weeklySummary.data[0].timelogsCount,
    2,
  );
  TestValidator.equals(
    "employeesCount is 1 (only the test employee)",
    weeklySummary.data[0].employeesCount,
    1,
  );
  TestValidator.equals(
    "weekStartDate is Monday",
    weeklySummary.data[0].weekStartDate,
    mondayStr,
  );
  TestValidator.equals(
    "weekEndDate is Sunday",
    weeklySummary.data[0].weekEndDate,
    sundayStr,
  );
}