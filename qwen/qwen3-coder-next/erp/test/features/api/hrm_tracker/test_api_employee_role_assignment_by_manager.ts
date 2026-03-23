import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_hrm_tracker_member_employees_create } from "../../../generate/generate_random_hrm_tracker_member_employees_create";
import { generate_random_hrm_tracker_member_roles_create } from "../../../generate/generate_random_hrm_tracker_member_roles_create";
import { prepare_random_hrm_tracker_employee } from "../../../prepare/prepare_random_hrm_tracker_employee";
import { prepare_random_hrm_tracker_role } from "../../../prepare/prepare_random_hrm_tracker_role";

export async function test_api_employee_role_assignment_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager member with employee:manage permission
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(manager);
  // 2. Create employee member
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(employee);
  // 3. Create employee record in manager's organization
  const employeeRecord =
    await generate_random_hrm_tracker_member_employees_create(
      managerConnection,
      {
        body: {
          employment_type: "full-time" as const,
          status: "active" as const,
          position: "Engineer",
          department_id: null,
          role_id: null,
          organization_id:
            "00000000-0000-0000-0000-000000000000" satisfies string &
              tags.Format<"uuid">,
          user_id: employee.id,
        } satisfies IHrmTrackerEmployee.ICreate,
      },
    );
  typia.assert(employeeRecord);
  // 4. Create custom role in organization
  const role = await generate_random_hrm_tracker_member_roles_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: null,
        permissions: ["employee:read", "employee:manage"],
      } satisfies IHrmTrackerRole.ICreate,
    },
  );
  typia.assert(role);
  // 5. Assign role to employee
  await api.functional.hrmTracker.member.employees.role.assign(
    managerConnection,
    {
      employeeId: employeeRecord.id,
      body: {
        role_id: role.id,
      } satisfies IHrmTrackerEmployee.IAssign,
    },
  );
  // 6. Validate role was assigned correctly by fetching updated employee
  const updatedEmployee =
    await api.functional.hrmTracker.member.employees.create(managerConnection, {
      body: {
        employment_type: "full-time" as const,
        status: "active" as const,
        position: "Engineer",
        department_id: null,
        role_id: null,
        organization_id:
          "00000000-0000-0000-0000-000000000000" satisfies string &
            tags.Format<"uuid">,
        user_id: employee.id,
      } satisfies IHrmTrackerEmployee.ICreate,
    });
  typia.assert(updatedEmployee);
  TestValidator.equals("role assigned", updatedEmployee.role_id, role.id);
}
