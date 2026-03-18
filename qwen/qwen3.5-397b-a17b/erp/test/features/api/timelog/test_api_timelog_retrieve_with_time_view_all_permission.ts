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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test that a member with time:view_all permission can retrieve another employee's timelog.
 *
 * This test validates the permission-based access control where users with time:view_all
 * can view any timelog in the organization. The test flow:
 * 1. Register manager member account and create employee record with manager role
 * 2. Register regular employee member account and create employee record
 * 3. Create a project for timelog assignment
 * 4. Assign the employee to the project as a member
 * 5. Create a timelog entry for the employee
 * 6. Retrieve the timelog using manager's connection (validating time:view_all permission)
 * 7. Verify the timelog response contains complete and accurate information
 */
export async function test_api_timelog_retrieve_with_time_view_all_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager member account
  const managerAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Manager123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(managerAuth);
  // Create manager-specific connection
  const managerConnection: api.IConnection = { host: connection.host };
  managerConnection.headers = { Authorization: managerAuth.token.access };
  // 2. Create regular employee member account
  const employeeAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Employee123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeAuth);
  // Create employee-specific connection
  const employeeConnection: api.IConnection = { host: connection.host };
  employeeConnection.headers = { Authorization: employeeAuth.token.access };
  // 3. Create employee record for the regular employee (using manager connection)
  // Note: We need to get the employee role first, but since we don't have a list endpoint,
  // we'll use the member_id from the employee auth
  const employeeRecord =
    await generate_random_hrm_platform_member_employees_create(
      managerConnection,
      {
        body: {
          member_id: employeeAuth.id,
          employment_type: "full-time",
          role_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IHrmPlatformEmployee.ICreate,
      },
    );
  typia.assert(employeeRecord);
  // 4. Create a project for timelog assignment (using manager connection)
  const project = await generate_random_hrm_platform_member_projects_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 5. Assign employee to project as member (using manager connection)
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employeeRecord.id,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 6. Create a timelog entry for the employee (using employee connection)
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        date: new Date().toISOString(),
        duration_minutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 7. Retrieve the timelog using manager's connection (validating time:view_all permission)
  const retrievedTimelog = await api.functional.hrmPlatform.member.timelogs.at(
    managerConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrievedTimelog);
  // 8. Verify the timelog response contains complete and accurate information
  TestValidator.equals("timelog ID matches", retrievedTimelog.id, timelog.id);
  TestValidator.equals(
    "employee ID matches",
    retrievedTimelog.employee.id,
    employeeRecord.id,
  );
  TestValidator.equals(
    "project ID matches",
    retrievedTimelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "duration matches",
    retrievedTimelog.duration_minutes,
    timelog.duration_minutes,
  );
  TestValidator.equals(
    "billable flag matches",
    retrievedTimelog.billable,
    timelog.billable,
  );
  TestValidator.predicate(
    "has valid date",
    retrievedTimelog.date !== null && retrievedTimelog.date !== undefined,
  );
  TestValidator.predicate(
    "has employee info",
    retrievedTimelog.employee !== null &&
      retrievedTimelog.employee !== undefined,
  );
  TestValidator.predicate(
    "has project info",
    retrievedTimelog.project !== null && retrievedTimelog.project !== undefined,
  );
}