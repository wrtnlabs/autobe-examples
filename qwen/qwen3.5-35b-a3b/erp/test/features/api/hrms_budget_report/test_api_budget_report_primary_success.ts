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
import type { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTimesheet";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_organizations_employees_timelogs_create } from "../../../generate/generate_random_hrms_member_organizations_employees_timelogs_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";

export async function test_api_budget_report_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account (also creates organization)
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      display_name: RandomGenerator.name(),
      href: "https://test.example.com/join",
      referrer: "https://test.example.com",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(joinResult);
  // Step 2: Extract organization_id from organization_memberships
  const organization_id =
    joinResult.organization_memberships[0]?.organization.id;
  typia.assert(organization_id);
  // Step 3: Get role_id from the member's organization membership
  const role_id = joinResult.organization_memberships[0]?.organizationRole.id;
  typia.assert(role_id);
  // Step 4: Create a NEW connection for subsequent API calls with token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joinResult.token.access,
    },
  };
  // Step 5: Create project with budget_hours = 100
  const project =
    await api.functional.hrms.member.organizations.projects.create(
      memberConnection,
      {
        organizationId: organization_id,
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#3498db",
          budget_hours: 100,
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(project);
  // Step 6: Create organization membership to link member as employee
  // (Note: member already has a membership from join, so we use the existing role)
  const membership =
    await api.functional.hrms.member.organization_members.create(
      memberConnection,
      {
        body: {
          hrms_member_id: joinResult.id,
          hrms_organization_id: organization_id,
          hrms_organization_role_id: role_id,
        } satisfies IHrmsOrganizationMember.ICreate,
      },
    );
  typia.assert(membership);
  const employee_id = membership.member.id;
  // Step 7: Create timelogs totaling 50 hours (3000 minutes)
  const now = new Date();
  const test_date = now.toISOString().split("T")[0];
  const test_date_with_time = `${test_date}T10:00:00.000Z`;
  // Create 5 timelogs of 10 hours (600 minutes) each = 3000 minutes total
  const durations = [600, 600, 600, 600, 600]; // 5 x 600 minutes = 3000 minutes = 50 hours
  for (const duration of durations) {
    await api.functional.hrms.member.organizations.employees.timelogs.create(
      memberConnection,
      {
        organizationId: organization_id,
        employeeId: employee_id,
        body: {
          date: test_date_with_time,
          duration_minutes: duration,
          project_id: (project satisfies IHrmsProject as IHrmsProject & { id: string }).id,
          billable: true,
        } satisfies IHrmsTimelog.ICreate,
      },
    );
  }
  // Step 8: Call budget report endpoint
  const start_date = test_date;
  const end_date = test_date;
  const report = await api.functional.hrms.member.reports.budget(
    memberConnection,
    {
      body: {
        organization_id: organization_id,
        start_date: start_date,
        end_date: end_date,
      } satisfies IHrmsTimesheet.IRequest,
    },
  );
  typia.assert(report);
  // Step 9: Verify response includes project with correct values
  TestValidator.equals("report has data", report.data.length, 1);
  const budgetProject = report.data[0];
  typia.assert(budgetProject);
  TestValidator.equals("budget_hours is 100", budgetProject.budget_hours, 100);
  TestValidator.equals("actual_hours is 50", budgetProject.actual_hours, 50);
  TestValidator.equals(
    "utilization_percentage is 50.0",
    budgetProject.utilization_percentage,
    50,
  );
  // Step 10: Verify utilization_flag is false (50% < 80%)
  TestValidator.equals(
    "utilization_flag is false",
    budgetProject.utilization_flag,
    false,
  );
  // Step 11: Verify pagination metadata
  TestValidator.equals(
    "pagination has total_count",
    report.pagination.records,
    1,
  );
  TestValidator.equals("pagination current is 1", report.pagination.current, 1);
  // Step 12: Verify sorted by utilization_percentage descending
  if (report.data.length > 1) {
    TestValidator.predicate("report is sorted by utilization descending", () =>
      report.data
        .slice(0, -1)
        .every(
          (item, i) =>
            item.utilization_percentage >=
            report.data[i + 1].utilization_percentage,
        ),
    );
  }
}