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

export async function test_api_employee_contract_historical_record_immutable(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/erpHrmTime/join",
      referrer: "https://example.com/erpHrmTime",
      avatarImageUrl: null,
      phoneNumber: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const employeeId = authorized.id;
  const employeeContractId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    start_date: new Date().toISOString(),
    end_date: null,
    pay_rate: 1000,
    pay_period: "monthly",
    working_hours_per_week: 40,
    notes: "immutable historical contract update attempt",
  } satisfies IErpHrmTimeEmployeeContract.IUpdate;
  await TestValidator.error(
    "historical or unrelated contracts must not be editable through the active-contract update endpoint",
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.update(
        memberConnection,
        {
          employeeId,
          employeeContractId,
          body,
        },
      );
    },
  );
  await TestValidator.error(
    "the employee-to-contract path relationship must be enforced",
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.update(
        memberConnection,
        {
          employeeId: typia.random<string & tags.Format<"uuid">>(),
          employeeContractId,
          body,
        },
      );
    },
  );
}
