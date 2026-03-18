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

export async function test_api_employee_create_membership_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  const activeConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  const body = {
    userAccountId: typia.random<string & tags.Format<"uuid">>(),
    roleId: typia.random<string & tags.Format<"uuid">>(),
    employmentType: RandomGenerator.pick([
      "full_time",
      "part_time",
      "contractor",
      "intern",
    ] as const),
    positionTitle: RandomGenerator.name(),
  } satisfies IHrmTimeTrackingEmployee.ICreate;
  const employee = await api.functional.hrmTimeTracking.member.employees.create(
    activeConnection,
    {
      body,
    },
  );
  typia.assert(employee);
  TestValidator.equals(
    "employee user account id",
    employee.userAccount,
    employee.userAccount,
  );
  TestValidator.equals("employee role id", employee.role.id, employee.role.id);
  TestValidator.equals(
    "employee employment type",
    employee.employmentType,
    body.employmentType,
  );
  TestValidator.equals(
    "employee position title",
    employee.positionTitle,
    body.positionTitle,
  );
  TestValidator.equals(
    "employee organization id exists",
    employee.organization.id,
    employee.organization.id,
  );
  TestValidator.predicate(
    "employee has organization timestamps",
    employee.organization.createdAt <= employee.organization.updatedAt,
  );
  TestValidator.predicate(
    "employee has audit timestamps",
    employee.createdAt <= employee.updatedAt,
  );
  TestValidator.equals("employee deletedAt", employee.deletedAt, null);
}
