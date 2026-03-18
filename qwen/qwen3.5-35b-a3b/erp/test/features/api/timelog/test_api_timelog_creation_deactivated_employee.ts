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
import { generate_random_hrms_member_organizations_employees_timelogs_create } from "../../../generate/generate_random_hrms_member_organizations_employees_timelogs_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";

export async function test_api_timelog_creation_deactivated_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: typia.random<IHrmsMember.IJoin>(),
  });
  typia.assert(owner);
  // 2. Create organization membership for owner
  const orgMember =
    await generate_random_hrms_member_organization_members_create(
      ownerConnection,
      {
        body: typia.random<IHrmsOrganizationMember.ICreate>(),
      },
    );
  typia.assert(orgMember);
  // 3. Extract organization ID
  const organizationId = orgMember.organization.id;
  // 4. Create project for timelog reference
  const project =
    await generate_random_hrms_member_organizations_projects_create(
      ownerConnection,
      {
        body: typia.random<IHrmsProject.ICreate>(),
        params: { organizationId },
      },
    );
  typia.assert(project);
  // 5. Create employee member account
  const employeeMemberConnection: api.IConnection = { host: connection.host };
  const employeeMember = await authorize_member_join(employeeMemberConnection, {
    body: typia.random<IHrmsMember.IJoin>(),
  });
  typia.assert(employeeMember);
  // 6. Add employee to organization
  const employeeMembership =
    await generate_random_hrms_member_organization_members_create(
      employeeMemberConnection,
      {
        body: typia.random<IHrmsOrganizationMember.ICreate>(),
      },
    );
  typia.assert(employeeMembership);
  // 7. Create employee record with active status
  const employeeCreateBody = {
    display_name: employeeMember.display_name,
    position: RandomGenerator.name(),
    employment_type: "full-time",
    status: "active",
  } satisfies IHrmsEmployee.IUpdate;
  const employee =
    await api.functional.hrms.member.organizations.employees.update(
      ownerConnection,
      {
        organizationId,
        employeeId: employeeMembership.id,
        body: employeeCreateBody,
      },
    );
  typia.assert(employee);
  // 8. Deactivate the employee
  const deactivateBody = {
    status: "deactivated",
  } satisfies IHrmsEmployee.IUpdate;
  const deactivatedEmployee =
    await api.functional.hrms.member.organizations.employees.update(
      ownerConnection,
      {
        organizationId,
        employeeId: employeeMembership.id,
        body: deactivateBody,
      },
    );
  typia.assert(deactivatedEmployee);
  // 9. Validate employee status is deactivated
  TestValidator.equals(
    "employee status deactivated",
    deactivatedEmployee.status,
    "deactivated",
  );
  // 10. Attempt to create timelog for deactivated employee (should be rejected)
  await TestValidator.httpError(
    "deactivated employee cannot create timelog",
    400,
    async () => {
      await api.functional.hrms.member.organizations.employees.timelogs.create(
        ownerConnection,
        {
          organizationId,
          employeeId: employeeMembership.id,
          body: {
            date: new Date().toISOString(),
            duration_minutes: 60,
            project_id: (project as IHrmsProject & { id: string }).id,
            billable: true,
          } satisfies IHrmsTimelog.ICreate,
        },
      );
    },
  );
}
