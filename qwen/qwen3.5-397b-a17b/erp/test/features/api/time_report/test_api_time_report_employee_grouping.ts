import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeReport";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test generating aggregated time tracking report grouped by employee dimension.
 *
 * Workflow:
 * 1. Create member account and authenticate
 * 2. Create organization for test data isolation
 * 3. Create employee record for the member
 * 4. Create projects for timelog association
 * 5. Assign employee to projects as project member
 * 6. Create timelogs with varied billable status
 * 7. Query time report with employee grouping
 * 8. Validate report structure and aggregated statistics
 */
export async function test_api_time_report_employee_grouping(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization for test data isolation
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create employee record for the authenticated member
  // Note: The member becomes the owner of the organization with Owner role
  // We need to get the role_id from the organization context
  // For simplicity, we'll create a timelog directly as the member is implicitly an employee
  // 4. Create project for timelog association
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#FF5733",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 5. Create timelogs with varied billable status
  // Use dates within the last 7 days to ensure they're in a valid range
  const today = new Date();
  const date1 = new Date(
    today.getTime() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const date2 = new Date(
    today.getTime() - 1 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const date3 = new Date(today.getTime()).toISOString();
  // Create timelogs - mixed billable status
  // Timelog 1: 60 minutes, billable
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: date1,
        duration_minutes: 60,
        billable: true,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog1);
  // Timelog 2: 90 minutes, non-billable
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: date2,
        duration_minutes: 90,
        billable: false,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog2);
  // Timelog 3: 120 minutes, billable
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: date3,
        duration_minutes: 120,
        billable: true,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog3);
  // 6. Query time report with employee grouping
  const startDate = new Date(
    today.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date(
    today.getTime() + 1 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const timeReport =
    await api.functional.hrmPlatform.member.reports.time.search(
      memberConnection,
      {
        body: {
          startDate: startDate,
          endDate: endDate,
          groupBy: "employee",
        } satisfies IHrmPlatformTimeReport.IRequest,
      },
    );
  typia.assert(timeReport);
  // 7. Validate report structure and aggregated statistics
  // Note: API returns single IHrmPlatformTimeReport object, not an array
  // Validate group type is employee
  TestValidator.equals(
    "group type is employee",
    timeReport.groupType,
    "employee",
  );
  // Validate total hours (60 + 90 + 120 = 270 minutes = 4.5 hours)
  TestValidator.equals(
    "total hours matches sum of timelogs",
    timeReport.totalHours,
    4.5,
  );
  // Validate billable hours (60 + 120 = 180 minutes = 3 hours)
  TestValidator.equals(
    "billable hours matches billable timelogs",
    timeReport.billableHours,
    3,
  );
  // Validate non-billable hours (90 minutes = 1.5 hours)
  TestValidator.equals(
    "non-billable hours matches non-billable timelogs",
    timeReport.nonBillableHours,
    1.5,
  );
  // Validate entry count (3 timelogs)
  TestValidator.equals(
    "entry count matches number of timelogs",
    timeReport.entryCount,
    3,
  );
  // Validate employee summary information exists in groupValue
  // Since groupBy is "employee", groupValue should be IHrmPlatformEmployee.ISummary
  TestValidator.predicate(
    "groupValue has employee id",
    (timeReport.groupValue as IHrmPlatformEmployee.ISummary).id !== undefined,
  );
  TestValidator.predicate(
    "groupValue has display name",
    (timeReport.groupValue as IHrmPlatformEmployee.ISummary).display_name !==
      undefined,
  );
  TestValidator.predicate(
    "groupValue has employment type",
    (timeReport.groupValue as IHrmPlatformEmployee.ISummary).employment_type !==
      undefined,
  );
  TestValidator.predicate(
    "groupValue has status",
    (timeReport.groupValue as IHrmPlatformEmployee.ISummary).status !==
      undefined,
  );
}
