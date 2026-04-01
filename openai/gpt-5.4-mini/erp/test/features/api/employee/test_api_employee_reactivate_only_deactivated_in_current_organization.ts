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

export async function test_api_employee_reactivate_only_deactivated_in_current_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
      password: `${RandomGenerator.alphaNumeric(12)}Aa1!`,
      name: RandomGenerator.name(),
      href: "https://example.com/erp/register",
      referrer: "https://example.com/erp/signup",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const deactivatedEmployee =
    await api.functional.erpHrmTime.member.employees.deactivate.deactivateEmployee(
      memberConnection,
      {
        employeeId,
      },
    );
  typia.assert(deactivatedEmployee);
  const reactivatedEmployee =
    await api.functional.erpHrmTime.member.employees.reactivate(
      memberConnection,
      {
        employeeId: deactivatedEmployee.id,
      },
    );
  typia.assert(reactivatedEmployee);
  TestValidator.equals(
    "reactivated employee id should be preserved",
    reactivatedEmployee.id,
    deactivatedEmployee.id,
  );
  TestValidator.equals(
    "reactivated employee should be active",
    reactivatedEmployee.status,
    "active",
  );
}
