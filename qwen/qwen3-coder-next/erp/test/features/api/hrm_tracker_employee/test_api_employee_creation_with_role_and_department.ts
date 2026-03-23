import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_departments_create } from "../../../generate/generate_random_hrm_tracker_member_departments_create";
import { generate_random_hrm_tracker_member_employees_create } from "../../../generate/generate_random_hrm_tracker_member_employees_create";
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { generate_random_hrm_tracker_member_roles_create } from "../../../generate/generate_random_hrm_tracker_member_roles_create";
import { prepare_random_hrm_tracker_department } from "../../../prepare/prepare_random_hrm_tracker_department";
import { prepare_random_hrm_tracker_employee } from "../../../prepare/prepare_random_hrm_tracker_employee";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";
import { prepare_random_hrm_tracker_role } from "../../../prepare/prepare_random_hrm_tracker_role";

export async function test_api_employee_creation_with_role_and_department(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member to be assigned as employee
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.hrmTracker.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        phone: null,
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create organization
  const orgConnection: api.IConnection = { host: connection.host };
  await api.functional.hrmTracker.auth.member.join(orgConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  const organization =
    await api.functional.hrmTracker.member.organizations.create(orgConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "USD",
        timezone: "America/New_York",
        fiscal_start_month: 1,
      } satisfies IHrmTrackerOrganization.ICreate,
    });
  typia.assert(organization);
  // 3. Create role within same organization
  const roleConnection: api.IConnection = { host: connection.host };
  await api.functional.hrmTracker.auth.member.join(roleConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  const role = await api.functional.hrmTracker.member.roles.create(
    roleConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        permissions: ["employee:read", "employee:write"],
      } satisfies IHrmTrackerRole.ICreate,
    },
  );
  typia.assert(role);
  // 4. Create department within same organization
  const deptConnection: api.IConnection = { host: connection.host };
  await api.functional.hrmTracker.auth.member.join(deptConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  const department = await api.functional.hrmTracker.member.departments.create(
    deptConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        parent_id: null,
      } satisfies IHrmTrackerDepartment.ICreate,
    },
  );
  typia.assert(department);
  // 5. Create employee with role and department from same organization
  const employeeConnection: api.IConnection = { host: connection.host };
  await api.functional.hrmTracker.auth.member.join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  const employee = await api.functional.hrmTracker.member.employees.create(
    employeeConnection,
    {
      body: {
        employment_type: "full-time",
        status: "active",
        position: RandomGenerator.name(),
        department_id: department.id,
        role_id: role.id,
        organization_id: organization.id,
        user_id: member.id,
      } satisfies IHrmTrackerEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 6. Verify employee has correct role and department
  TestValidator.equals("employee role_id matches", employee.role_id, role.id);
  TestValidator.equals(
    "employee department_id matches",
    employee.department_id,
    department.id,
  );
  // 7. Test that referencing role from different organization fails
  const differentOrgConnection: api.IConnection = { host: connection.host };
  await api.functional.hrmTracker.auth.member.join(differentOrgConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  const differentOrg =
    await api.functional.hrmTracker.member.organizations.create(
      differentOrgConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        } satisfies IHrmTrackerOrganization.ICreate,
      },
    );
  typia.assert(differentOrg);
  const differentRole = await api.functional.hrmTracker.member.roles.create(
    differentOrgConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        permissions: ["employee:read"],
      } satisfies IHrmTrackerRole.ICreate,
    },
  );
  typia.assert(differentRole);
  await TestValidator.error(
    "role from different organization fails",
    async () => {
      await api.functional.hrmTracker.member.employees.create(
        employeeConnection,
        {
          body: {
            employment_type: "full-time",
            status: "active",
            position: RandomGenerator.name(),
            department_id: department.id,
            role_id: differentRole.id,
            organization_id: organization.id,
            user_id: member.id,
          } satisfies IHrmTrackerEmployee.ICreate,
        },
      );
    },
  );
  // 8. Test that referencing department from different organization fails
  const differentDeptConnection: api.IConnection = { host: connection.host };
  await api.functional.hrmTracker.auth.member.join(differentDeptConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  const differentDepartment =
    await api.functional.hrmTracker.member.departments.create(
      differentDeptConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          parent_id: null,
        } satisfies IHrmTrackerDepartment.ICreate,
      },
    );
  typia.assert(differentDepartment);
  await TestValidator.error(
    "department from different organization fails",
    async () => {
      await api.functional.hrmTracker.member.employees.create(
        employeeConnection,
        {
          body: {
            employment_type: "full-time",
            status: "active",
            position: RandomGenerator.name(),
            department_id: differentDepartment.id,
            role_id: role.id,
            organization_id: organization.id,
            user_id: member.id,
          } satisfies IHrmTrackerEmployee.ICreate,
        },
      );
    },
  );
}
