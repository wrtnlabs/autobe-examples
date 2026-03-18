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

export async function test_api_timelog_update_by_employee_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration - creates member and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create organization for context
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create employee record for the member
  // The generate utility handles role selection internally through prepare function
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: memberAuth.id,
        employment_type: "full-time",
        status: "active",
      },
    },
  );
  typia.assert(employee);
  // 4. Create project for timelog assignment
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#3498db",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 5. Assign employee to project as member
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 6. Create timelog entry to be updated
  const originalTimelog =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: new Date().toISOString(),
          duration_minutes: 60,
          description: "Original work description",
          billable: true,
        },
      },
    );
  typia.assert(originalTimelog);
  // Store original values for comparison
  const originalCreatedAt = originalTimelog.created_at;
  const originalUpdatedAt = originalTimelog.updated_at;
  // 7. Update the timelog with new values
  const updatedDuration = 120;
  const updatedDescription = "Updated work description";
  const updatedBillable = false;
  const updatedTimelog =
    await api.functional.hrmPlatform.member.timelogs.update(memberConnection, {
      timelogId: originalTimelog.id,
      body: {
        duration_minutes: updatedDuration,
        description: updatedDescription,
        billable: updatedBillable,
      },
    });
  typia.assert(updatedTimelog);
  // 8. Validate the updated timelog
  TestValidator.equals(
    "duration_minutes updated",
    updatedTimelog.duration_minutes,
    updatedDuration,
  );
  TestValidator.equals(
    "description updated",
    updatedTimelog.description,
    updatedDescription,
  );
  TestValidator.equals(
    "billable flag updated",
    updatedTimelog.billable,
    updatedBillable,
  );
  TestValidator.notEquals(
    "updated_at changed",
    originalUpdatedAt,
    updatedTimelog.updated_at,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedTimelog.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "timelog id unchanged",
    updatedTimelog.id,
    originalTimelog.id,
  );
  TestValidator.equals(
    "employee unchanged",
    updatedTimelog.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "project unchanged",
    updatedTimelog.project.id,
    project.id,
  );
}
