import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeReport";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_time_report_filtered_by_project(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (becomes organization owner automatically)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create first project
  const project1 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project1);
  // 3. Create second project
  const project2 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#33FF57",
      },
    },
  );
  typia.assert(project2);
  // 4. Create timelogs on first project (multiple entries)
  const timelog1Duration = 120; // 2 hours in minutes
  const timelog2Duration = 180; // 3 hours in minutes
  const project1TotalMinutes = timelog1Duration + timelog2Duration; // 300 minutes
  const project1TotalHours = project1TotalMinutes / 60; // 5 hours total
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project1.id,
        date: new Date().toISOString(),
        duration: timelog1Duration,
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project1.id,
        date: new Date().toISOString(),
        duration: timelog2Duration,
        billable: true,
      },
    },
  );
  typia.assert(timelog2);
  // 5. Create timelogs on second project
  const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project2.id,
        date: new Date().toISOString(),
        duration: 240, // 4 hours
        billable: true,
      },
    },
  );
  typia.assert(timelog3);
  // 6. Generate time report filtered by project1
  const report = await api.functional.erpHrm.member.reports.time.index(
    memberConnection,
    {
      body: {
        groupBy: "project",
        project_id: project1.id,
        from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IErpHrmTimeReport.IRequest,
    },
  );
  typia.assert(report);
  // 7. Validations
  // Response should contain only entries for the specified project
  TestValidator.equals(
    "report should have exactly 1 entry",
    report.data.length,
    1,
  );
  const entry = report.data[0];
  // Entry should be grouped by project
  TestValidator.equals("groupBy should be project", entry.groupBy, "project");
  // Project summary should exist and have required fields
  TestValidator.predicate("project should not be null", entry.project !== null);
  if (entry.project === null) {
    throw new Error("Project should not be null for project-grouped report");
  }
  TestValidator.equals(
    "project id should match",
    entry.project.id,
    project1.id,
  );
  TestValidator.equals(
    "project name should match",
    entry.project.name,
    project1.name,
  );
  // Employee and task should be null for project grouping
  TestValidator.equals(
    "employee should be null for project grouping",
    entry.employee,
    null,
  );
  TestValidator.equals(
    "task should be null for project grouping",
    entry.task,
    null,
  );
  // Total hours should reflect only project1 timelogs (using tolerance for floating point)
  TestValidator.predicate(
    "total hours should match project1 timelogs",
    Math.abs(entry.totalHours - project1TotalHours) < 0.01,
  );
  TestValidator.predicate(
    "billable hours should match project1 timelogs",
    Math.abs(entry.billableHours - project1TotalHours) < 0.01,
  );
  TestValidator.equals(
    "non-billable hours should be zero",
    entry.nonBillableHours,
    0,
  );
  TestValidator.equals("timelog count should be 2", entry.timelogCount, 2);
  // Pagination should reflect filtered results
  TestValidator.equals(
    "pagination current page should be 1",
    report.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination total records should be 1",
    report.pagination.records,
    1,
  );
}
