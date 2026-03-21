import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_weekly_summary_report_project_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with owner permissions
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Define date range within a single week for predictable testing
  const weekStartDate = new Date("2024-01-08T00:00:00Z"); // Monday
  const weekEndDate = new Date("2024-01-14T23:59:59Z"); // Sunday
  // 3. Create two separate projects
  const projectA = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project Alpha",
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(projectA);
  const projectB = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project Beta",
        color_code: "#3357FF",
      },
    },
  );
  typia.assert(projectB);
  // 4. Create timelogs for Project A (2 entries, total 240 minutes = 4 hours)
  const timelogA1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: projectA.id,
        date: new Date("2024-01-09T09:00:00Z").toISOString(),
        duration: 120, // 2 hours
        description: "Development work on Project A",
        billable: true,
      },
    },
  );
  typia.assert(timelogA1);
  const timelogA2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: projectA.id,
        date: new Date("2024-01-10T14:00:00Z").toISOString(),
        duration: 120, // 2 hours
        description: "Code review for Project A",
        billable: true,
      },
    },
  );
  typia.assert(timelogA2);
  // 5. Create timelogs for Project B (3 entries, total 360 minutes = 6 hours)
  const timelogB1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: projectB.id,
        date: new Date("2024-01-09T14:00:00Z").toISOString(),
        duration: 180, // 3 hours
        description: "Design work on Project B",
        billable: true,
      },
    },
  );
  typia.assert(timelogB1);
  const timelogB2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: projectB.id,
        date: new Date("2024-01-11T10:00:00Z").toISOString(),
        duration: 90, // 1.5 hours
        description: "Testing for Project B",
        billable: true,
      },
    },
  );
  typia.assert(timelogB2);
  const timelogB3 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: projectB.id,
        date: new Date("2024-01-12T11:00:00Z").toISOString(),
        duration: 90, // 1.5 hours
        description: "Documentation for Project B",
        billable: false,
      },
    },
  );
  typia.assert(timelogB3);
  // 6. Get weekly summary filtered by Project A
  const summaryProjectA =
    await api.functional.erpHrm.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          from: weekStartDate.toISOString(),
          to: weekEndDate.toISOString(),
          project_id: projectA.id,
        },
      },
    );
  typia.assert(summaryProjectA);
  // 7. Get weekly summary filtered by Project B
  const summaryProjectB =
    await api.functional.erpHrm.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          from: weekStartDate.toISOString(),
          to: weekEndDate.toISOString(),
          project_id: projectB.id,
        },
      },
    );
  typia.assert(summaryProjectB);
  // 8. Get weekly summary without project filter (all projects)
  const summaryAll =
    await api.functional.erpHrm.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          from: weekStartDate.toISOString(),
          to: weekEndDate.toISOString(),
        },
      },
    );
  typia.assert(summaryAll);
  // 9. Validate Project A summary
  TestValidator.predicate(
    "Project A summary should have data",
    summaryProjectA.data.length > 0,
  );
  if (summaryProjectA.data.length > 0) {
    const weekA = summaryProjectA.data[0];
    // 2 timelogs * 120 minutes each = 240 minutes = 4 hours
    TestValidator.equals(
      "Project A total_hours should be 4",
      weekA.total_hours,
      4,
    );
    TestValidator.equals(
      "Project A timelog_count should be 2",
      weekA.timelog_count,
      2,
    );
    TestValidator.equals(
      "Project A employee_count should be 1",
      weekA.employee_count,
      1,
    );
  }
  // 10. Validate Project B summary
  TestValidator.predicate(
    "Project B summary should have data",
    summaryProjectB.data.length > 0,
  );
  if (summaryProjectB.data.length > 0) {
    const weekB = summaryProjectB.data[0];
    // 3 timelogs: 180 + 90 + 90 = 360 minutes = 6 hours
    TestValidator.equals(
      "Project B total_hours should be 6",
      weekB.total_hours,
      6,
    );
    TestValidator.equals(
      "Project B timelog_count should be 3",
      weekB.timelog_count,
      3,
    );
    TestValidator.equals(
      "Project B employee_count should be 1",
      weekB.employee_count,
      1,
    );
  }
  // 11. Validate combined summary equals sum of both projects
  TestValidator.predicate(
    "Combined summary should have data",
    summaryAll.data.length > 0,
  );
  if (
    summaryAll.data.length > 0 &&
    summaryProjectA.data.length > 0 &&
    summaryProjectB.data.length > 0
  ) {
    const weekAll = summaryAll.data[0];
    const weekA = summaryProjectA.data[0];
    const weekB = summaryProjectB.data[0];
    TestValidator.equals(
      "Combined total_hours should equal sum of both projects",
      weekAll.total_hours,
      weekA.total_hours + weekB.total_hours,
    );
    TestValidator.equals(
      "Combined timelog_count should equal sum of both projects",
      weekAll.timelog_count,
      weekA.timelog_count + weekB.timelog_count,
    );
    TestValidator.equals(
      "Combined employee_count should be 1 (same employee)",
      weekAll.employee_count,
      1,
    );
  }
}
