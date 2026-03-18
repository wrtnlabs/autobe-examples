import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
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
import { generate_random_hrms_member_organizations_departments_create } from "../../../generate/generate_random_hrms_member_organizations_departments_create";
import { generate_random_hrms_member_organizations_employees_timelogs_create } from "../../../generate/generate_random_hrms_member_organizations_employees_timelogs_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_projects_members_add_member } from "../../../generate/generate_random_hrms_member_projects_members_add_member";
import { prepare_random_hrms_department } from "../../../prepare/prepare_random_hrms_department";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_project_member } from "../../../prepare/prepare_random_hrms_project_member";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";

export async function test_api_timelog_update_by_manager_with_time_manage(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as employee (user A)
  const employeeAConnection: api.IConnection = { host: connection.host };
  const employeeA = await authorize_member_join(employeeAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeA);
  // 2. Get organization from employee A's memberships
  const orgId = employeeA.organization_memberships[0]?.organization.id;
  TestValidator.equals(
    "employee A has organization membership",
    orgId !== undefined && orgId !== null,
    true,
  );
  // 3. Auth as manager (user B)
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(manager);
  // 4. Get the organization ID from manager's memberships
  const managerOrgId = manager.organization_memberships[0]?.organization.id;
  TestValidator.equals(
    "manager has organization membership",
    managerOrgId !== undefined && managerOrgId !== null,
    true,
  );
  // 5. Manager creates department within organization
  const department =
    await generate_random_hrms_member_organizations_departments_create(
      managerConnection,
      {
        body: {
          name: RandomGenerator.name(),
        },
        params: {
          organizationId: orgId!,
        },
      },
    );
  typia.assert(department);
  // 6. Manager creates project within organization
  const project =
    await generate_random_hrms_member_organizations_projects_create(
      managerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color_code: "#3498db",
        },
        params: {
          organizationId: orgId!,
        },
      },
    );
  typia.assert(project);
  // 7. Manager adds employee A to the project
  const projectMember =
    await generate_random_hrms_member_projects_members_add_member(
      managerConnection,
      {
        body: {
          employee_id: employeeA.id,
          role: "member",
        },
        params: {
          projectId: (project as any).id,
        },
      },
    );
  typia.assert(projectMember);
  // 8. Auth as employee A and create a timelog
  const employeeACreationConnection: api.IConnection = {
    host: connection.host,
  };
  const employeeACreatedTimelog =
    await generate_random_hrms_member_organizations_employees_timelogs_create(
      employeeACreationConnection,
      {
        body: {
          date: new Date().toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<60>
          >(),
          project_id: (project as any).id,
          billable: true,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          organizationId: orgId!,
          employeeId: employeeA.id,
        },
      },
    );
  typia.assert(employeeACreatedTimelog);
  const originalDescription = (employeeACreatedTimelog as any).description;
  const originalDuration = (employeeACreatedTimelog as any).duration_minutes;
  // 9. Auth as manager B and update employee A's timelog
  const managerUpdateConnection: api.IConnection = { host: connection.host };
  const updatedTimelog = await api.functional.hrms.member.timelogs.update(
    managerUpdateConnection,
    {
      timelogId: (employeeACreatedTimelog as any).id,
      body: {
        description: "Updated by manager",
        duration_minutes: originalDuration + 30,
      },
    },
  );
  typia.assert(updatedTimelog);
  // 10. Verify the update succeeded
  TestValidator.equals(
    "timelog description was updated",
    (updatedTimelog as any).description,
    "Updated by manager",
  );
  TestValidator.equals(
    "timelog duration was updated",
    (updatedTimelog as any).duration_minutes,
    originalDuration + 30,
  );
  TestValidator.equals(
    "timelog ID remains the same",
    (updatedTimelog as any).id,
    (employeeACreatedTimelog as any).id,
  );
}
