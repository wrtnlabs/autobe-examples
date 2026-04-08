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
import { generate_random_erp_hrm_time_member_employees_create } from "../../../generate/generate_random_erp_hrm_time_member_employees_create";
import { prepare_random_erp_hrm_time_employee_dashboard_summary } from "../../../prepare/prepare_random_erp_hrm_time_employee_dashboard_summary";

export async function test_api_employee_delete_requires_management_permission(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const ownerJoin = await authorize_member_join(ownerConnection, {
    body: {
      email: `owner_${RandomGenerator.alphaNumeric(12)}@example.com`,
      password: `Pw${RandomGenerator.alphaNumeric(12)}!`,
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerJoin);
  const unauthorizedJoin = await authorize_member_join(unauthorizedConnection, {
    body: {
      email: `member_${RandomGenerator.alphaNumeric(12)}@example.com`,
      password: `Pw${RandomGenerator.alphaNumeric(12)}!`,
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(unauthorizedJoin);
  const employee = await generate_random_erp_hrm_time_member_employees_create(
    ownerConnection,
    {
      body: {
        member_id: ownerJoin.id,
        role_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  await TestValidator.httpError(
    "member without management permission cannot delete an employee",
    [401, 403],
    async () => {
      await api.functional.erpHrmTime.member.employees.erase(
        unauthorizedConnection,
        {
          employeeId: employee.id,
        },
      );
    },
  );
  const employeeAfter =
    await generate_random_erp_hrm_time_member_employees_create(
      ownerConnection,
      {
        body: {
          member_id: ownerJoin.id,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          employment_type: "part-time",
        },
      },
    );
  typia.assert(employeeAfter);
  TestValidator.notEquals(
    "delete failure must not alter the target employee identity",
    employee.id,
    employeeAfter.id,
  );
}
