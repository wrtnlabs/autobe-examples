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

export async function test_api_budget_report_no_projects_with_budget(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (also creates organization)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberJoin);
  // 2. Extract organization_id from join response
  const organization = memberJoin.organization_memberships[0].organization;
  typia.assert(organization);
  const organizationId: string = organization.id;
  // 3. Create project WITHOUT budget_hours (leave as NULL)
  const projectConnection: api.IConnection = { host: connection.host };
  const rawProject =
    await api.functional.hrms.member.organizations.projects.create(
      projectConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: RandomGenerator.alphaNumeric(6),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          budget_hours: null,
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(rawProject);
  // Extract project ID from the response (cast to ISummary to access id property)
  const project: IHrmsProject.ISummary =
    rawProject as unknown as IHrmsProject.ISummary;
  const projectId: string = project.id;
  // 4. Create organization membership to link member as employee
  const role = memberJoin.organization_memberships[0].organizationRole;
  typia.assert(role);
  const membershipConnection: api.IConnection = { host: connection.host };
  const membership =
    await api.functional.hrms.member.organization_members.create(
      membershipConnection,
      {
        body: {
          hrms_member_id: memberJoin.id,
          hrms_organization_id: organizationId,
          hrms_organization_role_id: role.id,
        } satisfies IHrmsOrganizationMember.ICreate,
      },
    );
  typia.assert(membership);
  // 5. Get employee_id from membership response
  const employeeId: string = membership.member.id;
  // 6. Create timelogs for the employee against the project
  const timelogConnection: api.IConnection = { host: connection.host };
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const timelogs = await Promise.all(
    ArrayUtil.repeat(5, async () =>
      api.functional.hrms.member.organizations.employees.timelogs.create(
        timelogConnection,
        {
          organizationId,
          employeeId,
          body: {
            date: new Date(
              currentYear,
              currentMonth,
              randint(1, daysInMonth),
            ).toISOString(),
            duration_minutes: typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<30> &
                tags.Maximum<480>
            >(),
            project_id: projectId,
            billable: typia.random<boolean>(),
            description: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IHrmsTimelog.ICreate,
        },
      ),
    ),
  );
  typia.assert(timelogs);
  // 7. Call budget report endpoint
  const reportConnection: api.IConnection = { host: connection.host };
  const startDate = new Date(currentYear, currentMonth, 1);
  const endDate = new Date(currentYear, currentMonth, daysInMonth);
  const report = await api.functional.hrms.member.reports.budget(
    reportConnection,
    {
      body: {
        organization_id: organizationId,
        start_date: startDate.toISOString().split("T")[0] as string &
          tags.Format<"date">,
        end_date: endDate.toISOString().split("T")[0] as string &
          tags.Format<"date">,
      } satisfies IHrmsTimesheet.IRequest,
    },
  );
  typia.assert(report);
  // 8. Verify response has empty data array (no projects with budget_hours included)
  TestValidator.equals(
    "budget report data array is empty when no projects have budget",
    report.data,
    [],
  );
  // 9. Verify pagination metadata
  TestValidator.equals(
    "budget report pagination records count is 0",
    report.pagination.records,
    0,
  );
  TestValidator.equals(
    "budget report pagination current page is 1",
    report.pagination.current,
    1,
  );
  TestValidator.equals(
    "budget report pagination pages count is 0",
    report.pagination.pages,
    0,
  );
  // 10. Verify no division by zero error (successful 200 response means this)
  TestValidator.predicate(
    "budget report endpoint does not throw division by zero error",
    () => report.data.length === 0 && report.pagination.records === 0,
  );
}
