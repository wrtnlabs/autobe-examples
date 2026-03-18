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

export async function test_api_employee_reactivate_state_and_organization_guard(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(member);
  const employee =
    await generate_random_hrm_time_tracking_member_employees_create(
      memberConnection,
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
      memberConnection,
      {
        employeeId: employee.id,
      },
    );
  typia.assert(deactivated);
  const reactivated =
    await api.functional.hrmTimeTracking.member.employees.reactivate(
      memberConnection,
      {
        employeeId: employee.id,
      },
    );
  typia.assert(reactivated);
  TestValidator.equals(
    "reactivated employee should keep the same employee id",
    reactivated.id,
    employee.id,
  );
  TestValidator.equals(
    "reactivated employee should stay in the same organization",
    reactivated.organization.id,
    employee.organization.id,
  );
  TestValidator.equals(
    "reactivated employee should keep the same position title",
    reactivated.positionTitle,
    employee.positionTitle,
  );
  TestValidator.equals(
    "reactivated employee should keep the same employment type",
    reactivated.employmentType,
    employee.employmentType,
  );
  TestValidator.equals(
    "reactivated employee should keep the same creation timestamp",
    reactivated.createdAt,
    employee.createdAt,
  );
  TestValidator.equals(
    "reactivated employee should keep the same update timestamp after state transition handling",
    reactivated.updatedAt,
    reactivated.updatedAt,
  );
  TestValidator.equals(
    "reactivated employee should be active again",
    reactivated.status,
    "active",
  );
  TestValidator.equals(
    "reactivated employee should remain undeleted",
    reactivated.deletedAt,
    employee.deletedAt,
  );
}
