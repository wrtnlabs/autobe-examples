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

export async function test_api_employee_membership_update_success(
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
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const update: IHrmTimeTrackingEmployee.IUpdate = {
    department_id: null,
    position_title: RandomGenerator.name(),
    employment_type: RandomGenerator.pick([
      "full-time",
      "part-time",
      "contractor",
      "intern",
    ] as const),
    status: RandomGenerator.pick([
      "active",
      "inactive",
      "deactivated",
    ] as const),
  };
  const updated =
    await api.functional.hrmTimeTracking.member.employees.patchByEmployeeid(
      memberConnection,
      {
        employeeId,
        body: update,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "employee id should remain the same",
    updated.id,
    employeeId,
  );
  TestValidator.equals(
    "position title should reflect the update",
    updated.positionTitle,
    update.position_title ?? null,
  );
  TestValidator.equals(
    "employment type should reflect the update",
    updated.employmentType,
    update.employment_type,
  );
  TestValidator.equals(
    "status should reflect the update",
    updated.status,
    update.status,
  );
  TestValidator.equals(
    "department should be cleared when department_id is null",
    updated.department,
    null,
  );
  TestValidator.predicate(
    "updatedAt should be a valid date-time string",
    !Number.isNaN(Date.parse(updated.updatedAt)),
  );
  TestValidator.predicate(
    "createdAt should not be later than updatedAt",
    Date.parse(updated.createdAt) <= Date.parse(updated.updatedAt),
  );
}
