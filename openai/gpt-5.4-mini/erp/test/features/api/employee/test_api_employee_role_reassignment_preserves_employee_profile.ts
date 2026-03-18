import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_employees_create } from "../../../generate/generate_random_hrm_time_tracking_member_employees_create";
import { generate_random_hrm_time_tracking_member_roles_create } from "../../../generate/generate_random_hrm_time_tracking_member_roles_create";
import { prepare_random_hrm_time_tracking_employee } from "../../../prepare/prepare_random_hrm_time_tracking_employee";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";

export async function test_api_employee_role_reassignment_preserves_employee_profile(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  const initialRole =
    await generate_random_hrm_time_tracking_member_roles_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          code: RandomGenerator.alphabets(8),
          sortOrder: typia.random<number & tags.Type<"int32">>(),
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(initialRole);
  const replacementRole =
    await generate_random_hrm_time_tracking_member_roles_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          code: RandomGenerator.alphabets(8),
          sortOrder: typia.random<number & tags.Type<"int32">>(),
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(replacementRole);
  const employee =
    await generate_random_hrm_time_tracking_member_employees_create(
      memberConnection,
      {
        body: {
          userAccountId: joined.id,
          roleId: initialRole.id,
          departmentId: null,
          positionTitle: RandomGenerator.name(),
          employmentType: RandomGenerator.pick([
            "full_time",
            "part_time",
            "contractor",
            "intern",
          ] as const),
          status: "active",
        } satisfies IHrmTimeTrackingEmployee.ICreate,
      },
    );
  typia.assert(employee);
  const originalEmployeeSnapshot = {
    organizationId: employee.organization.id,
    userAccount: employee.userAccount,
    department: employee.department,
    positionTitle: employee.positionTitle,
    employmentType: employee.employmentType,
    status: employee.status,
    roleId: employee.role.id,
  };
  const updatedEmployee =
    await api.functional.hrmTimeTracking.member.employees.roles.putByEmployeeidAndEmployeeroleid(
      memberConnection,
      {
        employeeId: employee.id,
        employeeRoleId: replacementRole.id,
      },
    );
  typia.assert(updatedEmployee);
  TestValidator.equals(
    "employee id stays the same",
    updatedEmployee.id,
    employee.id,
  );
  TestValidator.equals(
    "organization stays the same",
    updatedEmployee.organization.id,
    originalEmployeeSnapshot.organizationId,
  );
  TestValidator.equals(
    "linked user account stays the same",
    updatedEmployee.userAccount,
    originalEmployeeSnapshot.userAccount,
  );
  TestValidator.equals(
    "department stays the same",
    updatedEmployee.department,
    originalEmployeeSnapshot.department,
  );
  TestValidator.equals(
    "position title stays the same",
    updatedEmployee.positionTitle,
    originalEmployeeSnapshot.positionTitle,
  );
  TestValidator.equals(
    "employment type stays the same",
    updatedEmployee.employmentType,
    originalEmployeeSnapshot.employmentType,
  );
  TestValidator.equals(
    "status stays the same",
    updatedEmployee.status,
    originalEmployeeSnapshot.status,
  );
  TestValidator.equals(
    "role was reassigned",
    updatedEmployee.role.id,
    replacementRole.id,
  );
  TestValidator.notEquals(
    "role changed from original",
    updatedEmployee.role.id,
    originalEmployeeSnapshot.roleId,
  );
  TestValidator.equals(
    "replacement role organization matches employee organization",
    updatedEmployee.role.organization.id,
    employee.organization.id,
  );
  TestValidator.equals(
    "replacement role name preserved",
    updatedEmployee.role.name,
    replacementRole.name,
  );
  TestValidator.equals(
    "replacement role builtin flag preserved",
    updatedEmployee.role.isBuiltin,
    replacementRole.is_builtin,
  );
  TestValidator.equals(
    "replacement role code preserved",
    updatedEmployee.role.code,
    replacementRole.code,
  );
  TestValidator.equals(
    "replacement role description preserved",
    updatedEmployee.role.description,
    replacementRole.description,
  );
  TestValidator.equals(
    "replacement role order preserved",
    updatedEmployee.role.sortOrder,
    replacementRole.sort_order,
  );
}
