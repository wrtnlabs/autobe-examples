import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeRole";
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
import { prepare_random_hrm_time_tracking_employee } from "../../../prepare/prepare_random_hrm_time_tracking_employee";

export async function test_api_employee_role_reassignment_single_active_role(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const employee =
    await generate_random_hrm_time_tracking_member_employees_create(
      memberConnection,
      {
        body: {
          userAccountId: typia.random<string & tags.Format<"uuid">>(),
          roleId: typia.random<string & tags.Format<"uuid">>(),
          employmentType: RandomGenerator.alphabets(8),
          status: RandomGenerator.alphabets(8),
        } satisfies IHrmTimeTrackingEmployee.ICreate,
      },
    );
  typia.assert(employee);
  const firstAssignment =
    await api.functional.hrmTimeTracking.member.employees.roles.create(
      memberConnection,
      { employeeId: employee.id },
    );
  typia.assert(firstAssignment);
  const secondAssignment =
    await api.functional.hrmTimeTracking.member.employees.roles.create(
      memberConnection,
      { employeeId: employee.id },
    );
  typia.assert(secondAssignment);
  TestValidator.equals(
    "employee id should remain stable across reassignment",
    firstAssignment.hrm_time_tracking_employee_id,
    employee.id,
  );
  TestValidator.equals(
    "employee id should remain stable across second reassignment",
    secondAssignment.hrm_time_tracking_employee_id,
    employee.id,
  );
  TestValidator.notEquals(
    "a reassignment should replace the active role assignment rather than duplicating it",
    firstAssignment.id,
    secondAssignment.id,
  );
  TestValidator.notEquals(
    "the active role should change on reassignment",
    firstAssignment.hrm_time_tracking_role_id,
    secondAssignment.hrm_time_tracking_role_id,
  );
  TestValidator.equals(
    "the updated assignment should be active",
    secondAssignment.effective_to,
    null,
  );
  TestValidator.equals(
    "the assignment should still belong to the same employee",
    secondAssignment.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "the response should describe the same employee relation",
    secondAssignment.employee.id,
    firstAssignment.employee.id,
  );
}
