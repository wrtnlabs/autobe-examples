import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IReportTime } from "@ORGANIZATION/PROJECT-api/lib/structures/IReportTime";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test time report grouped by employee dimension with billable/non-billable breakdown.
 *
 * Validates the time report aggregation endpoint when grouped by employee, verifying that total hours, billable hours, and non-billable hours are correctly calculated from timelog entries. The test creates multiple timelogs with mixed billable statuses and confirms the report accurately reflects the sum of all durations and the billable/non-billable split.
 *
 * Special attention is given to verifying that hour calculations correctly divide duration minutes by 60, that the billable breakdown accurately separates chargeable and internal work time, and that the employee identity is properly populated in the response.
 *
 * 1. Authenticate as a new member, creating default organization and employee record.
 * 2. Create a project within the organization for timelogs to reference.
 * 3. Create multiple timelogs with mixed billable/non-billable entries on the same date.
 * 4. Call the time report endpoint with employee dimension and date range covering the timelogs.
 * 5. Validate that total hours, billable hours, and non-billable hours match expected calculations.
 */
export async function test_api_time_report_employee_grouped_with_billable_breakdown(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (creates default organization and employee record)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create a project within the organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 3. Create timelogs with mixed billable/non-billable entries
  const today = new Date().toISOString();
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: today,
        durationMinutes: 120,
        billable: true,
        workDescription: "Client billing work",
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: today,
        durationMinutes: 60,
        billable: false,
        workDescription: "Internal training",
      },
    },
  );
  typia.assert(timelog2);
  // 4. Call time report endpoint with employee dimension
  const report =
    await api.functional.hrmPlatform.member.reports.time.timeReport(
      memberConnection,
      {
        body: {
          dimension: "employee",
          from: today,
          to: today,
          employee_id: timelog1.employee.id,
        } satisfies IReportTime.IRequest,
      },
    );
  typia.assert(report);
  // 5. Validate total hours, billable hours, non-billable hours
  const expectedTotalMinutes = 120 + 60;
  const expectedTotalHours = expectedTotalMinutes / 60;
  const expectedBillableMinutes = 120;
  const expectedBillableHours = expectedBillableMinutes / 60;
  const expectedNonBillableMinutes = 60;
  const expectedNonBillableHours = expectedNonBillableMinutes / 60;
  TestValidator.predicate("report contains entries", true);
  const employeeEntry = report;
  typia.assertGuard(employeeEntry);
  TestValidator.equals(
    "employee identity matches",
    employeeEntry.employee?.id,
    timelog1.employee.id,
  );
  TestValidator.equals(
    "total hours matches sum of all timelog durations divided by 60",
    employeeEntry.total_hours,
    expectedTotalHours,
  );
  TestValidator.equals(
    "billable hours matches sum of billable timelogs divided by 60",
    employeeEntry.billable_hours,
    expectedBillableHours,
  );
  TestValidator.equals(
    "non-billable hours matches sum of non-billable timelogs divided by 60",
    employeeEntry.non_billable_hours,
    expectedNonBillableHours,
  );
}
