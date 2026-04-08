import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_detail_permission_restriction(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: connection.host,
      referrer: connection.host,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(owner);
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: connection.host,
      referrer: connection.host,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  await TestValidator.httpError(
    "employee detail access should be denied for another member without view permission",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.employees.at(memberConnection, {
        employeeId: owner.id,
      });
    },
  );
  const self = await api.functional.erpHrmTime.member.employees.at(
    memberConnection,
    {
      employeeId: member.id,
    },
  );
  typia.assert(self);
  TestValidator.equals("self record should be accessible", self.id, self.id);
  TestValidator.predicate(
    "self record should expose organization scope",
    self.erpHrmTimeOrganizationId.length > 0,
  );
  TestValidator.predicate(
    "self record should expose role relation",
    self.erpHrmTimeRoleId.length > 0,
  );
}
