import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTimelog";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_employees_timelogs_create } from "../../../generate/generate_random_hrms_member_organizations_employees_timelogs_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";

export async function test_api_weekly_report_generation(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Generate a weekly summary report for a valid date range and validate that it correctly calculates weekly aggregations.
   * 1. Authenticate member with organization membership and report:view permission
   * 2. Create sample timelog data spanning multiple weeks within the organization
   * 3. Generate weekly report for a date range covering complete weeks
   * 4. Validate response structure, pagination, sorting, and calculation correctness
   */
  // 1. Setup - Authenticate member and create organization
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member);
  // Extract organization from member's memberships
  const orgMembership = member.organization_memberships[0];
  typia.assert(orgMembership);
  const organizationId: string = orgMembership.organization.id;
  // 2. Generate date range covering 2 complete weeks (Monday to Sunday)
  const baseDate = new Date();
  const dayOfWeek = baseDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const lastMonday = new Date(baseDate);
  lastMonday.setDate(
    baseDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1),
  );
  const week1Start = lastMonday.toISOString().split("T")[0];
  const week2Start = new Date(lastMonday.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  // 3. Create sample timelogs spanning 2 weeks
  const timelogsData: Array<{
    date: string;
    duration_minutes: number;
    billable: boolean;
    description?: string;
  }> = [];
  // Week 1 timelogs (5 timelogs)
  for (let i = 0; i < 5; i++) {
    const date = new Date(
      lastMonday.getTime() + (i % 7) * 24 * 60 * 60 * 1000,
    ).toISOString();
    timelogsData.push({
      date: date,
      duration_minutes:
        (i + 1) * 60 +
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<30>
        >(),
      billable: i % 2 === 0,
      description: RandomGenerator.paragraph({ sentences: 1 }),
    });
  }
  // Week 2 timelogs (4 timelogs)
  for (let i = 0; i < 4; i++) {
    const date = new Date(
      lastMonday.getTime() +
        7 * 24 * 60 * 60 * 1000 +
        (i % 7) * 24 * 60 * 60 * 1000,
    ).toISOString();
    timelogsData.push({
      date: date,
      duration_minutes:
        (i + 2) * 45 +
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<45>
        >(),
      billable: true,
      description: RandomGenerator.paragraph({ sentences: 1 }),
    });
  }
  // 4. Create the timelogs via SDK
  for (const timelogData of timelogsData) {
    await api.functional.hrms.member.organizations.employees.timelogs.create(
      memberConnection,
      {
        organizationId,
        employeeId: member.id,
        body: {
          date: timelogData.date,
          duration_minutes: timelogData.duration_minutes,
          project_id: "" as string & tags.Format<"uuid">,
          billable: timelogData.billable,
          description: timelogData.description,
        },
      },
    );
  }
  // 5. Generate weekly report for date range covering week 1 and week 2
  // Use IHrmsTimelog as body type since that's what the SDK expects
  const reportBody = {
    start_date: week1Start,
    end_date: week2Start,
  } as unknown as IHrmsTimelog;
  const reportResponse =
    await api.functional.hrms.member.reports.weekly.generate(memberConnection, {
      body: reportBody,
    });
  typia.assert(reportResponse);
  // 6. Validate response structure
  // Check pagination exists and has valid structure
  TestValidator.equals(
    "response has pagination",
    reportResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(reportResponse.data),
    true,
  );
  // Validate pagination metadata
  const pagination = reportResponse.pagination;
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.equals("limit is set", pagination.limit > 0, true);
  TestValidator.equals(
    "total records matches data length",
    pagination.records,
    reportResponse.data.length,
  );
  TestValidator.equals(
    "pages is correct",
    pagination.pages,
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit),
  );
  // Validate weekly report data - check that data exists
  TestValidator.equals(
    "response has data rows",
    reportResponse.data.length > 0,
    true,
  );
  // Validate each row structure
  reportResponse.data.forEach((row) => {
    TestValidator.equals("row has group_id", row.group_id !== "", true);
    TestValidator.equals("row has group_name", row.group_name !== "", true);
    TestValidator.equals("row has total_hours", row.total_hours >= 0, true);
    TestValidator.equals(
      "row has billable_hours",
      row.billable_hours >= 0,
      true,
    );
    TestValidator.equals(
      "row has non_billable_hours",
      row.non_billable_hours >= 0,
      true,
    );
    TestValidator.equals(
      "total hours equals sum",
      row.total_hours,
      row.billable_hours + row.non_billable_hours,
    );
  });
  // 7. Validate calculations - aggregate hours from all timelogs
  const expectedTotalHours = timelogsData.reduce(
    (acc, t) => acc + t.duration_minutes / 60,
    0,
  );
  const expectedBillableHours = timelogsData
    .filter((t) => t.billable)
    .reduce((acc, t) => acc + t.duration_minutes / 60, 0);
  const expectedNonBillableHours = timelogsData
    .filter((t) => !t.billable)
    .reduce((acc, t) => acc + t.duration_minutes / 60, 0);
  // Sum all rows in the report
  const reportedTotalHours = reportResponse.data.reduce(
    (acc, row) => acc + row.total_hours,
    0,
  );
  const reportedBillableHours = reportResponse.data.reduce(
    (acc, row) => acc + row.billable_hours,
    0,
  );
  const reportedNonBillableHours = reportResponse.data.reduce(
    (acc, row) => acc + row.non_billable_hours,
    0,
  );
  TestValidator.equals(
    "total hours matches calculated",
    reportedTotalHours,
    expectedTotalHours,
  );
  TestValidator.equals(
    "billable hours matches calculated",
    reportedBillableHours,
    expectedBillableHours,
  );
  TestValidator.equals(
    "non-billable hours matches calculated",
    reportedNonBillableHours,
    expectedNonBillableHours,
  );
}
