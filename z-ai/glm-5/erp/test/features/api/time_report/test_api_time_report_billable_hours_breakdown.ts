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

export async function test_api_time_report_billable_hours_breakdown(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that the time report correctly separates billable and non-billable hours.
   * Setup: Create member account, create a project, create timelogs with billable=true
   * and timelogs with billable=false. Execute: Call time report endpoint with groupBy='project'.
   * Validate: Response shows totalHours equals billableHours plus nonBillableHours.
   * Billable hours only include timelogs where billable flag is true.
   * Non-billable hours only include timelogs where billable flag is false.
   * Each group entry includes timelogCount showing total number of entries.
   */
  // 1. Create member account (becomes organization owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // 2. Create a project for time tracking
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733" satisfies string &
          tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
      },
    },
  );
  typia.assert(project);
  // 3. Create billable timelog entries (client work)
  const billableDurations = [120, 180, 90];
  const billableTimelogs: IErpHrmTimelog[] = [];
  for (let i = 0; i < billableDurations.length; i++) {
    const timelog = await generate_random_erp_hrm_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: new Date().toISOString(),
          duration: billableDurations[i] satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: true,
        } satisfies IErpHrmTimelog.ICreate,
      },
    );
    typia.assert(timelog);
    billableTimelogs.push(timelog);
  }
  // 4. Create non-billable timelog entries (internal activities)
  const nonBillableDurations = [60, 45, 30, 15];
  const nonBillableTimelogs: IErpHrmTimelog[] = [];
  for (let i = 0; i < nonBillableDurations.length; i++) {
    const timelog = await generate_random_erp_hrm_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: new Date().toISOString(),
          duration: nonBillableDurations[i] satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: false,
        } satisfies IErpHrmTimelog.ICreate,
      },
    );
    typia.assert(timelog);
    nonBillableTimelogs.push(timelog);
  }
  // 5. Call time report endpoint with groupBy='project'
  const reportResponse = await api.functional.erpHrm.member.reports.time.index(
    memberConnection,
    {
      body: {
        groupBy: "project",
      } satisfies IErpHrmTimeReport.IRequest,
    },
  );
  typia.assert(reportResponse);
  // 6. Find the project entry in the report
  const projectReport = reportResponse.data.find(
    (entry) => entry.project !== null && entry.project.id === project.id,
  );
  TestValidator.predicate(
    "project report should exist",
    projectReport !== undefined,
  );
  // 7. Validate billable hours calculation (minutes to hours conversion)
  const expectedBillableHours =
    billableDurations.reduce((sum, d) => sum + d, 0) / 60;
  TestValidator.equals(
    "billable hours match",
    projectReport!.billableHours,
    expectedBillableHours,
  );
  // 8. Validate non-billable hours calculation (minutes to hours conversion)
  const expectedNonBillableHours =
    nonBillableDurations.reduce((sum, d) => sum + d, 0) / 60;
  TestValidator.equals(
    "non-billable hours match",
    projectReport!.nonBillableHours,
    expectedNonBillableHours,
  );
  // 9. Validate total hours equals billable + non-billable
  const expectedTotalHours = expectedBillableHours + expectedNonBillableHours;
  TestValidator.equals(
    "total hours equal billable + non-billable",
    projectReport!.totalHours,
    expectedTotalHours,
  );
  // 10. Validate timelog count
  const totalTimelogCount =
    billableTimelogs.length + nonBillableTimelogs.length;
  TestValidator.equals(
    "timelog count matches",
    projectReport!.timelogCount,
    totalTimelogCount,
  );
  // 11. Validate groupBy is correct
  TestValidator.equals("groupBy is project", projectReport!.groupBy, "project");
}
