import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_deactivate_other_organization_employee(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const foreignEmployeeId = "00000000-0000-0000-0000-000000000000" as string;
  await TestValidator.httpError(
    "cannot deactivate an employee from another organization",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.employees.deactivate.deactivateEmployee(
        memberAConnection,
        {
          employeeId: foreignEmployeeId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "cannot deactivate an employee from a different organization context",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.employees.deactivate.deactivateEmployee(
        memberBConnection,
        {
          employeeId: foreignEmployeeId,
        },
      );
    },
  );
}
