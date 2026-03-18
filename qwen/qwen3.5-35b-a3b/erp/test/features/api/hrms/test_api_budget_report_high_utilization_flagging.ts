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

export async function test_api_budget_report_high_utilization_flagging(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and organization
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  TestValidator.equals(
    "member has organization",
    member.organization_memberships.length > 0,
    true,
  );
  const organizationId = member.organization_memberships[0].organization.id;
  const roleId = member.organization_memberships[0].organizationRole.id;
  // 2. Create Project A with budget_hours=100
  const projectA =
    await api.functional.hrms.member.organizations.projects.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(2),
          color_code: "#FF5733",
          budget_hours: 100,
        },
      },
    );
  typia.assert(projectA);
  const projectAId = (projectA as IHrmsProject & { id: string }).id;
  // 3. Create Project B with budget_hours=50
  const projectB =
    await api.functional.hrms.member.organizations.projects.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(2),
          color_code: "#33FF57",
          budget_hours: 50,
        },
      },
    );
  typia.assert(projectB);
  const projectBId = (projectB as IHrmsProject & { id: string }).id;
  // 4. Create employee membership (member already has membership, get employee_id)
  const employeeId = member.id;
  // 5. Create timelogs for Project A totaling 75 hours (75 * 60 = 4500 minutes)
  const today = new Date().toISOString().split("T")[0];
  const timelog1 =
    await api.functional.hrms.member.organizations.employees.timelogs.create(
      memberConnection,
      {
        organizationId,
        employeeId,
        body: {
          date: today,
          duration_minutes: 4500, // 75 hours
          project_id: projectAId,
          billable: true,
        },
      },
    );
  typia.assert(timelog1);
  // 6. Create timelogs for Project B totaling 45 hours (45 * 60 = 2700 minutes)
  const timelog2 =
    await api.functional.hrms.member.organizations.employees.timelogs.create(
      memberConnection,
      {
        organizationId,
        employeeId,
        body: {
          date: today,
          duration_minutes: 2700, // 45 hours
          project_id: projectBId,
          billable: true,
        },
      },
    );
  typia.assert(timelog2);
  // 7. Call budget report endpoint
  const weekStart = today;
  const weekEnd = today;
  const report = await api.functional.hrms.member.reports.budget(
    memberConnection,
    {
      body: {
        organization_id: organizationId,
        start_date: weekStart,
        end_date: weekEnd,
      },
    },
  );
  typia.assert(report);
  // 8. Verify both projects are returned
  const data = report.data;
  TestValidator.equals("data array not empty", data.length > 0, true);
  const projectAEntry = data.find((p) => p.project_id === projectAId);
  const projectBEntry = data.find((p) => p.project_id === projectBId);
  TestValidator.equals(
    "Project A in report",
    projectAEntry !== undefined,
    true,
  );
  TestValidator.equals(
    "Project B in report",
    projectBEntry !== undefined,
    true,
  );
  // 9. Verify Project A has utilization_percentage=75.0 and utilization_flag=false
  if (projectAEntry) {
    TestValidator.equals(
      "Project A utilization percentage",
      projectAEntry.utilization_percentage,
      75.0,
    );
    TestValidator.equals(
      "Project A utilization flag false",
      projectAEntry.utilization_flag,
      false,
    );
  }
  // 10. Verify Project B has utilization_percentage=90.0 and utilization_flag=true
  if (projectBEntry) {
    TestValidator.equals(
      "Project B utilization percentage",
      projectBEntry.utilization_percentage,
      90.0,
    );
    TestValidator.equals(
      "Project B utilization flag true",
      projectBEntry.utilization_flag,
      true,
    );
  }
  // 11. Verify results are sorted by utilization_percentage descending (Project B first)
  if (data.length >= 2) {
    TestValidator.equals(
      "Project B first (higher utilization)",
      data[0].project_id,
      projectBId,
    );
    TestValidator.equals(
      "Project A second (lower utilization)",
      data[1].project_id,
      projectAId,
    );
  }
  // 12. Verify hours calculated correctly
  if (projectAEntry && projectAEntry.budget_hours === 100) {
    TestValidator.equals(
      "Project A actual hours",
      projectAEntry.actual_hours,
      75.0,
    );
  }
  if (projectBEntry && projectBEntry.budget_hours === 50) {
    TestValidator.equals(
      "Project B actual hours",
      projectBEntry.actual_hours,
      45.0,
    );
  }
}