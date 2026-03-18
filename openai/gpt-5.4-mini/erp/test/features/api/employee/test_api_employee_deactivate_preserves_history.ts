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

export async function test_api_employee_deactivate_preserves_history(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const deactivated =
    await api.functional.hrmTimeTracking.member.employees.deactivate(
      memberConnection,
      {
        employeeId,
      },
    );
  typia.assert(deactivated);
  TestValidator.equals("employee id is preserved", deactivated.id, employeeId);
  TestValidator.predicate(
    "organization summary exists",
    () => deactivated.organization.id.length > 0,
  );
  TestValidator.predicate(
    "linked user account summary exists",
    () =>
      deactivated.userAccount !== null &&
      typeof deactivated.userAccount === "object",
  );
  TestValidator.predicate(
    "role summary exists",
    () => deactivated.role.id.length > 0,
  );
  TestValidator.predicate(
    "timestamps are present",
    () => deactivated.createdAt.length > 0 && deactivated.updatedAt.length > 0,
  );
  const deactivatedAgain =
    await api.functional.hrmTimeTracking.member.employees.deactivate(
      memberConnection,
      {
        employeeId,
      },
    );
  typia.assert(deactivatedAgain);
  TestValidator.equals(
    "repeat deactivation returns same employee id",
    deactivatedAgain.id,
    employeeId,
  );
  TestValidator.equals(
    "repeat deactivation preserves organization",
    deactivatedAgain.organization.id,
    deactivated.organization.id,
  );
  TestValidator.equals(
    "repeat deactivation preserves role",
    deactivatedAgain.role.id,
    deactivated.role.id,
  );
  TestValidator.equals(
    "repeat deactivation preserves status field",
    deactivatedAgain.status,
    deactivated.status,
  );
}
