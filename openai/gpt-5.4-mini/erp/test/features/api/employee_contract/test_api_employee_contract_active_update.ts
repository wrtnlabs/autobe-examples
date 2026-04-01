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

export async function test_api_employee_contract_active_update(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const managerConnection: api.IConnection = { host: connection.host };
  const actor = await api.functional.erpHrmTime.auth.member.join(
    actorConnection,
    {
      body: {
        email: `${RandomGenerator.alphabets(8)}@test.com`,
        password: "Password123!",
        name: RandomGenerator.name(),
        href: "https://example.com/join",
        referrer: "https://example.com/register",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(actor);
  const manager = await api.functional.erpHrmTime.auth.member.join(
    managerConnection,
    {
      body: {
        email: `${RandomGenerator.alphabets(8)}@test.com`,
        password: "Password123!",
        name: RandomGenerator.name(),
        href: "https://example.com/join",
        referrer: "https://example.com/register",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(manager);
  const employeeId = actor.id;
  const created =
    await api.functional.erpHrmTime.member.employees.contracts.create(
      actorConnection,
      {
        employeeId,
        body: {
          startDate: new Date("2026-01-01T00:00:00.000Z").toISOString(),
          endDate: null,
          payRate: 3500,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: "Initial active contract",
        } satisfies IErpHrmTimeEmployeeContract.ICreate,
      },
    );
  typia.assert(created);
  const updated =
    await api.functional.erpHrmTime.member.employees.contracts.update(
      actorConnection,
      {
        employeeId,
        contractId: created.id,
        body: {
          startDate: new Date("2026-02-01T00:00:00.000Z").toISOString(),
          endDate: null,
          payRate: 4200,
          payPeriod: "monthly",
          workingHoursPerWeek: 38,
          notes: "Updated active contract",
        } satisfies IErpHrmTimeEmployeeContract.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "employee relationship is preserved",
    updated.employee,
    created.employee,
  );
  TestValidator.equals(
    "start date is updated",
    updated.startDate,
    new Date("2026-02-01T00:00:00.000Z").toISOString(),
  );
  TestValidator.equals("end date remains null", updated.endDate, null);
  TestValidator.equals("pay rate is updated", updated.payRate, 4200);
  TestValidator.equals("pay period is updated", updated.payPeriod, "monthly");
  TestValidator.equals(
    "working hours are updated",
    updated.workingHoursPerWeek,
    38,
  );
  TestValidator.equals(
    "notes are updated",
    updated.notes,
    "Updated active contract",
  );
  TestValidator.notEquals(
    "updated contract differs from original",
    created,
    updated,
  );
  const managerCreated =
    await api.functional.erpHrmTime.member.employees.contracts.create(
      managerConnection,
      {
        employeeId: manager.id,
        body: {
          startDate: new Date("2026-01-01T00:00:00.000Z").toISOString(),
          endDate: null,
          payRate: 3000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: "Manager contract",
        } satisfies IErpHrmTimeEmployeeContract.ICreate,
      },
    );
  typia.assert(managerCreated);
  await TestValidator.error(
    "contract update should fail for a different employee contract id",
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.update(
        actorConnection,
        {
          employeeId,
          contractId: managerCreated.id,
          body: {
            startDate: new Date("2026-03-01T00:00:00.000Z").toISOString(),
            endDate: null,
            payRate: 4300,
            payPeriod: "monthly",
            workingHoursPerWeek: 40,
            notes: "Wrong employee contract",
          } satisfies IErpHrmTimeEmployeeContract.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "non-management member should not be able to update contract",
    async () => {
      await api.functional.erpHrmTime.member.employees.contracts.update(
        managerConnection,
        {
          employeeId,
          contractId: created.id,
          body: {
            startDate: new Date("2026-03-01T00:00:00.000Z").toISOString(),
            endDate: null,
            payRate: 4400,
            payPeriod: "monthly",
            workingHoursPerWeek: 40,
            notes: "Unauthorized update",
          } satisfies IErpHrmTimeEmployeeContract.IUpdate,
        },
      );
    },
  );
}
