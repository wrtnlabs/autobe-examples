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

export async function test_api_employee_role_assignment_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeMember = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(employeeMember);
  const employeeRoleSeed = typia.random<string & tags.Format<"uuid">>();
  const employee =
    await generate_random_hrm_time_tracking_member_employees_create(
      memberConnection,
      {
        body: {
          userAccountId: employeeMember.id,
          roleId: employeeRoleSeed,
          employmentType: RandomGenerator.pick([
            "full-time",
            "part-time",
            "contractor",
            "intern",
          ] as const),
          status: "active",
        } satisfies IHrmTimeTrackingEmployee.ICreate,
      },
    );
  typia.assert(employee);
  const assignment =
    await api.functional.hrmTimeTracking.member.employees.roles.create(
      memberConnection,
      {
        employeeId: employee.id,
      },
    );
  typia.assert(assignment);
  TestValidator.equals(
    "employee linkage should match the created employee",
    assignment.hrm_time_tracking_employee_id,
    employee.id,
  );
  TestValidator.equals(
    "employee relation should match the created employee",
    assignment.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "role linkage should match the returned role relation",
    assignment.hrm_time_tracking_role_id,
    assignment.role.id,
  );
  TestValidator.equals(
    "role organization should exist on the returned role",
    assignment.role.organization.id,
    assignment.employee.organization.id,
  );
  TestValidator.equals(
    "assignment should be active",
    assignment.deleted_at,
    null,
  );
  TestValidator.equals(
    "assignment should remain active",
    assignment.effective_to,
    null,
  );
  TestValidator.predicate(
    "assignment should have a valid created/updated timestamp order",
    () => assignment.created_at <= assignment.updated_at,
  );
}
