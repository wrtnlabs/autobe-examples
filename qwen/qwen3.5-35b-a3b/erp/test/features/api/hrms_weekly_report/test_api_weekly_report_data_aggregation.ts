import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
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
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";

export async function test_api_weekly_report_data_aggregation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a member to authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member);
  // Get organization ID
  const organizationId = member.organization_memberships[0].organization.id;
  const employeeId = member.organization_memberships[0].member.id;
  // 2. Create a project for timelogs
  const project = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
  };
  // 3. Create timelogs across multiple dates for the same employee
  // Week 1 (January 1-7, 2024): 3 timelogs totaling 1380 minutes (23 hours)
  const week1Timelogs = await ArrayUtil.asyncMap([0, 2, 4], async (dayOffset) =>
    generate_random_hrms_member_organizations_employees_timelogs_create(
      memberConnection,
      {
        params: {
          organizationId,
          employeeId,
        },
        body: {
          date: new Date(2024, 0, 1 + dayOffset).toISOString(),
          duration_minutes: dayOffset === 0 ? 480 : dayOffset === 2 ? 360 : 540,
          project_id: project.id,
          billable: dayOffset !== 4,
        } satisfies IHrmsTimelog.ICreate,
      },
    ),
  );
  // Week 2 (January 8-14, 2024): 2 timelogs totaling 720 minutes (12 hours)
  const week2Timelogs = await ArrayUtil.asyncMap([1, 3], async (dayOffset) =>
    generate_random_hrms_member_organizations_employees_timelogs_create(
      memberConnection,
      {
        params: {
          organizationId,
          employeeId,
        },
        body: {
          date: new Date(2024, 0, 8 + dayOffset).toISOString(),
          duration_minutes: dayOffset === 1 ? 420 : 300,
          project_id: project.id,
          billable: true,
        } satisfies IHrmsTimelog.ICreate,
      },
    ),
  );
  // 4. Generate weekly report using the IHrmsTimelog structure
  // Note: IHrmsTimelog is used as request body per API spec, even though it appears to be response type
  const report = await api.functional.hrms.member.reports.weekly.generate(
    memberConnection,
    {
      body: typia.random<IHrmsTimelog>(),
    },
  );
  typia.assert(report);
  // 5. Validate report structure
  TestValidator.equals(
    "pagination should show aggregated result",
    report.pagination.records,
    report.data.length,
  );
  TestValidator.equals(
    "pagination should show 1 page",
    report.pagination.pages,
    1,
  );
  // 6. Validate data aggregation for employee
  const data = report.data;
  TestValidator.equals(
    "report should have employee entries",
    data.length > 0,
    true,
  );
  if (data.length > 0) {
    const employeeEntry = data[0];
    typia.assert(employeeEntry);
    // Verify total hours is positive
    TestValidator.predicate(
      "total hours should be positive",
      employeeEntry.total_hours > 0,
    );
    // Verify billable + non-billable = total
    const sumBillableAndNonBillable =
      employeeEntry.billable_hours + employeeEntry.non_billable_hours;
    TestValidator.equals(
      "billable + non-billable should equal total",
      sumBillableAndNonBillable,
      employeeEntry.total_hours,
    );
  }
  // 7. Validate employee name matches
  TestValidator.equals(
    "group name should match member display name",
    data[0]?.group_name,
    member.display_name,
  );
  // Validate group_id matches employee ID
  TestValidator.equals(
    "group_id should match employee ID",
    data[0]?.group_id,
    employeeId,
  );
}
