import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_employees_create } from "../../../generate/generate_random_hrm_tracker_member_employees_create";
import { prepare_random_hrm_tracker_employee } from "../../../prepare/prepare_random_hrm_tracker_employee";

export async function test_api_employee_update_role_and_department_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Manager joins organization
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(manager);
  // 2. Manager creates an employee record in same organization
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await generate_random_hrm_tracker_member_employees_create(
    managerConnection,
    {
      body: {
        employment_type: "full-time",
        status: "active",
        position: "Developer",
        department_id: null,
        role_id: null,
        organization_id: manager.id,
        user_id: manager.id,
      } satisfies IHrmTrackerEmployee.ICreate,
    },
  );
  typia.assert(employee);
  const oldUpdatedAt = employee.updated_at;
  // 3. Manager updates employee's role, department, and employment details
  const newRole = typia.random<string & tags.Format<"uuid">>();
  const newDepartment = typia.random<string & tags.Format<"uuid">>();
  const updatedEmployee =
    await api.functional.hrmTracker.member.employees.update(managerConnection, {
      employeeId: employee.id,
      body: {
        role_id: newRole,
        department_id: newDepartment,
        status: "active",
        employment_type: "full-time",
        position: "Senior Developer",
      } satisfies IHrmTrackerEmployee.IUpdate,
    });
  typia.assert(updatedEmployee);
  // 4. Validate updated employee record
  TestValidator.equals("role_id updated", updatedEmployee.role_id, newRole);
  TestValidator.equals(
    "department_id updated",
    updatedEmployee.department_id,
    newDepartment,
  );
  TestValidator.equals("status is active", updatedEmployee.status, "active");
  TestValidator.equals(
    "employment_type is full-time",
    updatedEmployee.employment_type,
    "full-time",
  );
  TestValidator.equals(
    "position updated",
    updatedEmployee.position,
    "Senior Developer",
  );
  TestValidator.equals(
    "organization_id unchanged",
    updatedEmployee.organization_id,
    employee.organization_id,
  );
  TestValidator.equals(
    "user_id unchanged",
    updatedEmployee.user_id,
    employee.user_id,
  );
  TestValidator.equals(
    "user matches",
    updatedEmployee.user.id,
    employee.user.id,
  );
  TestValidator.equals(
    "organization matches",
    updatedEmployee.organization.id,
    employee.organization.id,
  );
  TestValidator.predicate(
    "deleted_at remains NULL",
    updatedEmployee.deleted_at === null,
  );
  TestValidator.predicate(
    "updated_at changed",
    updatedEmployee.updated_at !== oldUpdatedAt,
  );
}
