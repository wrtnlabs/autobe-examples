import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
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
import { generate_random_erp_hrm_time_member_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_time_member_employees_contracts_create";
import { prepare_random_erp_hrm_time_employee_contract } from "../../../prepare/prepare_random_erp_hrm_time_employee_contract";

export async function test_api_employee_contract_history_immutability(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@example.com`,
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/register",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const historicalContract =
    await generate_random_erp_hrm_time_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId },
        body: {
          startDate: new Date("2024-01-01T00:00:00.000Z").toISOString(),
          endDate: new Date("2024-03-31T23:59:59.000Z").toISOString(),
          payRate: 3000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: "historical contract",
        } satisfies IErpHrmTimeEmployeeContract.ICreate,
      },
    );
  typia.assert(historicalContract);
  const activeContract =
    await generate_random_erp_hrm_time_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId },
        body: {
          startDate: new Date("2024-04-01T00:00:00.000Z").toISOString(),
          endDate: null,
          payRate: 3500,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: "active contract",
        } satisfies IErpHrmTimeEmployeeContract.ICreate,
      },
    );
  typia.assert(activeContract);
  const updatedActive =
    await api.functional.erpHrmTime.member.employees.contracts.update(
      memberConnection,
      {
        employeeId,
        contractId: activeContract.id,
        body: {
          payRate: 3600,
          notes: "active contract updated",
        } satisfies IErpHrmTimeEmployeeContract.IUpdate,
      },
    );
  typia.assert(updatedActive);
  TestValidator.equals(
    "active contract id should remain unchanged",
    updatedActive.id,
    activeContract.id,
  );
  TestValidator.equals(
    "employee contract should remain in the same employee timeline",
    updatedActive.employee,
    activeContract.employee,
  );
  TestValidator.equals(
    "pay rate should update on the active contract",
    updatedActive.payRate,
    3600,
  );
  TestValidator.equals(
    "notes should update on the active contract",
    updatedActive.notes,
    "active contract updated",
  );
  await TestValidator.error(
    "historical contract update should be rejected",
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.update(
        memberConnection,
        {
          employeeId,
          contractId: historicalContract.id,
          body: {
            payRate: 3200,
          } satisfies IErpHrmTimeEmployeeContract.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "overlapping contract history should be rejected",
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.update(
        memberConnection,
        {
          employeeId,
          contractId: activeContract.id,
          body: {
            startDate: new Date("2024-02-01T00:00:00.000Z").toISOString(),
          } satisfies IErpHrmTimeEmployeeContract.IUpdate,
        },
      );
    },
  );
}
