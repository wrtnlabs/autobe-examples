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
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_timelog_update_by_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with authentication
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 4. Select organization context
  await api.functional.hrmPlatform.member.organizations.select(
    memberConnection,
    {
      organizationId: organization.id,
    },
  );
  // 5. Create first project for initial timelog
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(project1);
  // 6. Create second project for update test
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#33FF57",
        status: "active",
      },
    },
  );
  typia.assert(project2);
  // 7. Create employee record for the member by calling index endpoint
  await api.functional.hrmPlatform.member.employees.index(memberConnection, {
    body: {},
  });
  // Get employee list to find the created employee
  const employeesPage = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(employeesPage);
  TestValidator.predicate("has employees", employeesPage.data.length > 0);
  const employee = employeesPage.data[0];
  // 8. Assign employee to first project as member
  const membership1 =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project1.id },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "member",
        },
      },
    );
  typia.assert(membership1);
  // 9. Assign employee to second project as member
  const membership2 =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project2.id },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "member",
        },
      },
    );
  typia.assert(membership2);
  // 10. Create initial timelog with billable=true
  const initialDate = new Date().toISOString();
  const initialTimelog =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: initialDate,
          durationMinutes: 60,
          projectId: project1.id,
          description: "Initial work description",
          billable: true,
        },
      },
    );
  typia.assert(initialTimelog);
  TestValidator.equals(
    "project matches",
    initialTimelog.project.id,
    project1.id,
  );
  TestValidator.equals("duration matches", initialTimelog.durationMinutes, 60);
  TestValidator.equals("billable is true", initialTimelog.billable, true);
  TestValidator.equals(
    "description matches",
    initialTimelog.description,
    "Initial work description",
  );
  // 11. Wait a moment to ensure updated_at will be different
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 12. Update timelog with modified values
  const updatedDate = new Date().toISOString();
  const updatedTimelog =
    await api.functional.hrmPlatform.member.timelogs.update(memberConnection, {
      timelogId: initialTimelog.id,
      body: {
        project_id: project2.id,
        duration_minutes: 90,
        description: "Updated work description",
        billable: false,
        date: updatedDate.split("T")[0],
      },
    });
  typia.assert(updatedTimelog);
  // 13. Verify update results
  TestValidator.equals(
    "project changed",
    updatedTimelog.project.id,
    project2.id,
  );
  TestValidator.notEquals(
    "project differs from original",
    updatedTimelog.project.id,
    project1.id,
  );
  TestValidator.equals("duration updated", updatedTimelog.durationMinutes, 90);
  TestValidator.notEquals(
    "duration differs from original",
    updatedTimelog.durationMinutes,
    60,
  );
  TestValidator.equals("billable is false", updatedTimelog.billable, false);
  TestValidator.notEquals(
    "billable differs from original",
    updatedTimelog.billable,
    true,
  );
  TestValidator.equals(
    "description updated",
    updatedTimelog.description,
    "Updated work description",
  );
  TestValidator.notEquals(
    "description differs from original",
    updatedTimelog.description,
    "Initial work description",
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedTimelog.updatedAt,
    initialTimelog.updatedAt,
  );
  TestValidator.predicate(
    "updated_at is later",
    new Date(updatedTimelog.updatedAt) > new Date(initialTimelog.updatedAt),
  );
}
