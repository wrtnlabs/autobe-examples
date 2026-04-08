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

export async function test_api_employee_contract_delete_wrong_employee_scope_blocked(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const employeeA: IErpHrmTimeEmployeeDashboardSummary =
    await generate_random_erp_hrm_time_member_employees_create(
      memberConnection,
      {
        body: {
          member_id: typia.random<string & tags.Format<"uuid">>(),
          role_id: typia.random<string & tags.Format<"uuid">>(),
          employment_type: "full-time",
        },
      },
    );
  typia.assert(employeeA);
  const employeeB: IErpHrmTimeEmployeeDashboardSummary =
    await generate_random_erp_hrm_time_member_employees_create(
      memberConnection,
      {
        body: {
          member_id: typia.random<string & tags.Format<"uuid">>(),
          role_id: typia.random<string & tags.Format<"uuid">>(),
          employment_type: "part-time",
        },
      },
    );
  typia.assert(employeeB);
  const contractId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete contract with mismatched employee path should be rejected",
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.erase(
        memberConnection,
        {
          employeeId: employeeA.id,
          employeeContractId: contractId,
        },
      );
    },
  );
  await TestValidator.error(
    "delete contract under the wrong employee identifier should be rejected",
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.erase(
        memberConnection,
        {
          employeeId: employeeB.id,
          employeeContractId: contractId,
        },
      );
    },
  );
}
