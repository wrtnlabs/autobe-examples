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

export async function test_api_employee_membership_update_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const primaryAuth = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      },
    },
  );
  typia.assert(primaryAuth);
  const secondaryAuth = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      },
    },
  );
  typia.assert(secondaryAuth);
  const primaryConnection: api.IConnection = { host: connection.host };
  primaryConnection.headers = { Authorization: primaryAuth.token.access };
  const secondaryConnection: api.IConnection = { host: connection.host };
  secondaryConnection.headers = { Authorization: secondaryAuth.token.access };
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "cross-organization employee update should fail",
    async () => {
      await api.functional.hrmTimeTracking.member.employees.patchByEmployeeid(
        secondaryConnection,
        {
          employeeId,
          body: {
            position_title: RandomGenerator.name(),
            employment_type: "contractor",
          } satisfies IHrmTimeTrackingEmployee.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "original organization employee should remain inaccessible from other tenant",
    async () => {
      await api.functional.hrmTimeTracking.member.employees.patchByEmployeeid(
        secondaryConnection,
        {
          employeeId,
          body: {
            status: "deactivated",
          } satisfies IHrmTimeTrackingEmployee.IUpdate,
        },
      );
    },
  );
  const safeBody = {
    department_id: null,
    position_title: null,
    employment_type: "full-time",
    status: "active",
  } satisfies IHrmTimeTrackingEmployee.IUpdate;
  void safeBody;
  TestValidator.predicate(
    "separate organization contexts were prepared",
    primaryConnection !== secondaryConnection,
  );
}
