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

export async function test_api_employee_membership_status_and_role_transition(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const createdEmployee =
    await generate_random_hrm_time_tracking_member_employees_create(
      memberConnection,
      {
        body: {
          userAccountId: typia.random<string & tags.Format<"uuid">>(),
          roleId: typia.random<string & tags.Format<"uuid">>(),
          employmentType: "full-time",
        } satisfies IHrmTimeTrackingEmployee.ICreate,
      },
    );
  typia.assert(createdEmployee);
  const updatedEmployee =
    await api.functional.hrmTimeTracking.member.employees.putByEmployeeid(
      memberConnection,
      {
        employeeId: createdEmployee.id,
        body: {
          department_id: createdEmployee.department?.id ?? null,
          position_title: RandomGenerator.name(),
          employment_type: "part-time",
        } satisfies IHrmTimeTrackingEmployee.IUpdate,
      },
    );
  typia.assert(updatedEmployee);
  TestValidator.equals(
    "employee id preserved",
    updatedEmployee.id,
    createdEmployee.id,
  );
  TestValidator.equals(
    "organization preserved",
    updatedEmployee.organization.id,
    createdEmployee.organization.id,
  );
  TestValidator.equals(
    "user account preserved",
    updatedEmployee.userAccount,
    createdEmployee.userAccount,
  );
  TestValidator.equals(
    "role preserved",
    updatedEmployee.role.id,
    createdEmployee.role.id,
  );
  TestValidator.equals(
    "department preserved or cleared as requested",
    updatedEmployee.department,
    createdEmployee.department,
  );
  TestValidator.equals(
    "employment type updated",
    updatedEmployee.employmentType,
    "part-time",
  );
  TestValidator.predicate(
    "position title assigned",
    typeof updatedEmployee.positionTitle === "string" &&
      updatedEmployee.positionTitle.length > 0,
  );
  TestValidator.predicate(
    "single role relation is preserved",
    updatedEmployee.role !== null &&
      typeof updatedEmployee.role.id === "string",
  );
}
