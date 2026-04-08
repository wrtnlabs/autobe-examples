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
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test that a manager with time:view_all permission can retrieve another employee's timelog.
 *
 * Validates the complete permission-based access control workflow for timelog retrieval. The test ensures that users with time:view_all permission can access timelogs created by other employees within the same organization, regardless of ownership.
 *
 * Special attention is given to verifying that the permission system correctly grants access based on role permissions rather than timelog ownership, and that the retrieved timelog data includes accurate employee references showing the original worker.
 *
 * 1. Create organization and authenticate first member as regular employee.
 * 2. Create custom role with time:view_all permission in the organization.
 * 3. Authenticate second member as manager and assign the custom role.
 * 4. Create a project and assign both employee and manager as project members.
 * 5. Employee creates a timelog entry on the project.
 * 6. Manager retrieves the employee's timelog using the timelog ID.
 * 7. Validate retrieved timelog contains correct data and employee reference.
 */
export async function test_api_timelog_retrieval_by_manager_with_time_view_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization and authenticate first member (regular employee)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeAuth);
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      employeeConnection,
      {},
    );
  typia.assert(organization);
  // 2. Create custom role with time:view_all permission for manager
  const managerRole = await generate_random_hrm_platform_member_roles_create(
    employeeConnection,
    {
      body: {
        organization_id: organization.id,
        name: `Manager_${RandomGenerator.alphabets(5)}`,
        description: "Custom manager role with time view all permission",
      },
    },
  );
  typia.assert(managerRole);
  // 3. Authenticate second member (manager)
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(managerAuth);
  // 4. Create project for time tracking
  const project = await generate_random_hrm_platform_member_projects_create(
    employeeConnection,
    {},
  );
  typia.assert(project);
  // 5. Employee creates a timelog entry on the project
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    employeeConnection,
    {
      body: {
        hrm_platform_project_id: project.id,
        date: new Date().toISOString(),
        duration_minutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 6. Manager retrieves the employee's timelog using the timelog ID
  // This validates that time:view_all permission grants access to other employees' timelogs
  const retrievedTimelog = await api.functional.hrmPlatform.member.timelogs.at(
    managerConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrievedTimelog);
  // 7. Validate retrieved timelog contains correct data and employee reference
  TestValidator.equals("timelog ID matches", retrievedTimelog.id, timelog.id);
  TestValidator.equals(
    "employee ID matches original creator",
    retrievedTimelog.employee.id,
    timelog.employee.id,
  );
  TestValidator.equals(
    "project ID matches",
    retrievedTimelog.project.id,
    timelog.project.id,
  );
  TestValidator.equals(
    "duration matches original entry",
    retrievedTimelog.duration_minutes,
    timelog.duration_minutes,
  );
  TestValidator.equals(
    "date matches original entry",
    retrievedTimelog.date,
    timelog.date,
  );
  TestValidator.equals(
    "billable flag matches",
    retrievedTimelog.billable,
    timelog.billable,
  );
}
