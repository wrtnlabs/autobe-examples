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

export async function test_api_employee_creation_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member to own organization
  const orgOwnerConnection: api.IConnection = { host: connection.host };
  const orgOwner = await api.functional.hrmTracker.auth.member.join(
    orgOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        phone: null,
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(orgOwner);
  // Step 2: Create organization
  const organization =
    await api.functional.hrmTracker.member.organizations.create(
      orgOwnerConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmTrackerOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // Step 3: Create another member to be assigned as employee
  const employeeMemberConnection: api.IConnection = {
    host: connection.host,
  };
  const employeeMember = await api.functional.hrmTracker.auth.member.join(
    employeeMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(employeeMember);
  // Step 4: Create role
  const role = await api.functional.hrmTracker.member.roles.create(
    orgOwnerConnection,
    {
      body: {
        name: `Role_${RandomGenerator.alphabets(5)}`,
        permissions: ["employee:read", "employee:write"],
      } satisfies IHrmTrackerRole.ICreate,
    },
  );
  typia.assert(role);
  // Step 5: Create department
  const department = await api.functional.hrmTracker.member.departments.create(
    orgOwnerConnection,
    {
      body: {
        name: `Department_${RandomGenerator.alphabets(5)}`,
        description: null,
        parent_id: null,
      } satisfies IHrmTrackerDepartment.ICreate,
    },
  );
  typia.assert(department);
  // Step 6: Create employee with all fields
  const positionValue = RandomGenerator.name(2);
  const employee = await api.functional.hrmTracker.member.employees.create(
    orgOwnerConnection,
    {
      body: {
        employment_type: "full-time" as const,
        status: "active" as const,
        position: positionValue,
        department_id: department.id,
        role_id: role.id,
        organization_id: organization.id,
        user_id: employeeMember.id,
      } satisfies IHrmTrackerEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // Step 7: Validate all fields
  TestValidator.equals(
    "employment_type matches",
    employee.employment_type,
    "full-time",
  );
  TestValidator.equals("status matches", employee.status, "active");
  TestValidator.equals("position matches", employee.position, positionValue);
  TestValidator.equals(
    "department_id matches",
    employee.department_id,
    department.id,
  );
  TestValidator.equals("role_id matches", employee.role_id, role.id);
  TestValidator.equals(
    "organization_id matches",
    employee.organization_id,
    organization.id,
  );
  TestValidator.equals("user_id matches", employee.user_id, employeeMember.id);
  TestValidator.predicate("has created_at", employee.created_at !== null);
  TestValidator.predicate("has updated_at", employee.updated_at !== null);
  TestValidator.equals("deleted_at is null", employee.deleted_at, null);
}
