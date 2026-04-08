import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
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

export async function test_api_employee_contract_update_permission_scope_restriction(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const employeeContractId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "member without employee-management permission cannot update a contract",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.update(
        memberConnection,
        {
          employeeId,
          employeeContractId,
          body: {
            pay_rate: 1234,
            notes: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IErpHrmTimeEmployeeContract.IUpdate,
        },
      );
    },
  );
  const otherOrgMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherOrgMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  await TestValidator.httpError(
    "cross-organization contract update is rejected",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.update(
        otherOrgMemberConnection,
        {
          employeeId: typia.random<string & tags.Format<"uuid">>(),
          employeeContractId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            pay_rate: 4321,
            working_hours_per_week: 40,
            notes: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IErpHrmTimeEmployeeContract.IUpdate,
        },
      );
    },
  );
}
