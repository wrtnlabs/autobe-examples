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
import { prepare_random_hrm_time_tracking_employee } from "../../../prepare/prepare_random_hrm_time_tracking_employee";

export async function test_api_employee_reactivate_deactivated_employee(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const signedUp = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(signedUp);
  const organizationConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${signedUp.token.access}` },
  };
  const employee =
    await generate_random_hrm_time_tracking_member_employees_create(
      organizationConnection,
      {
        body: {
          userAccountId: typia.random<string & tags.Format<"uuid">>(),
          roleId: typia.random<string & tags.Format<"uuid">>(),
          departmentId: null,
          positionTitle: RandomGenerator.name(),
          employmentType: "full_time",
          status: "active",
        } satisfies IHrmTimeTrackingEmployee.ICreate,
      },
    );
  typia.assert(employee);
  const deactivated =
    await api.functional.hrmTimeTracking.member.employees.deactivate(
      organizationConnection,
      { employeeId: employee.id },
    );
  typia.assert(deactivated);
  TestValidator.equals(
    "deactivated employee id should stay the same",
    deactivated.id,
    employee.id,
  );
  TestValidator.equals(
    "deactivated employee organization should stay the same",
    deactivated.organization,
    employee.organization,
  );
  TestValidator.equals(
    "deactivated employee user account should stay the same",
    deactivated.userAccount,
    employee.userAccount,
  );
  TestValidator.equals(
    "deactivated employee role should stay the same",
    deactivated.role,
    employee.role,
  );
  TestValidator.equals(
    "deactivated employee department should stay the same",
    deactivated.department,
    employee.department,
  );
  TestValidator.equals(
    "deactivated employee position title should stay the same",
    deactivated.positionTitle,
    employee.positionTitle,
  );
  TestValidator.equals(
    "deactivated employee employment type should stay the same",
    deactivated.employmentType,
    employee.employmentType,
  );
  TestValidator.equals(
    "deactivated employee createdAt should stay the same",
    deactivated.createdAt,
    employee.createdAt,
  );
  TestValidator.predicate(
    "deactivated employee must not be active",
    deactivated.status !== "active",
  );
  const reactivated =
    await api.functional.hrmTimeTracking.member.employees.reactivate(
      organizationConnection,
      { employeeId: employee.id },
    );
  typia.assert(reactivated);
  TestValidator.equals(
    "reactivated employee id should stay the same",
    reactivated.id,
    employee.id,
  );
  TestValidator.equals(
    "reactivated employee organization should stay the same",
    reactivated.organization,
    employee.organization,
  );
  TestValidator.equals(
    "reactivated employee user account should stay the same",
    reactivated.userAccount,
    employee.userAccount,
  );
  TestValidator.equals(
    "reactivated employee role should stay the same",
    reactivated.role,
    employee.role,
  );
  TestValidator.equals(
    "reactivated employee department should stay the same",
    reactivated.department,
    employee.department,
  );
  TestValidator.equals(
    "reactivated employee position title should stay the same",
    reactivated.positionTitle,
    employee.positionTitle,
  );
  TestValidator.equals(
    "reactivated employee employment type should stay the same",
    reactivated.employmentType,
    employee.employmentType,
  );
  TestValidator.equals(
    "reactivated employee createdAt should stay the same",
    reactivated.createdAt,
    employee.createdAt,
  );
  TestValidator.equals(
    "reactivated employee status should be active",
    reactivated.status,
    "active",
  );
  TestValidator.notEquals(
    "reactivated snapshot should differ from deactivated snapshot",
    reactivated,
    deactivated,
  );
}
