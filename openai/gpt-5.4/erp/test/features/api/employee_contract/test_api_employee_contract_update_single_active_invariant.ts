import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_employees_contracts_create } from "../../../generate/generate_random_hrm_time_tracking_owner_employees_contracts_create";
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { prepare_random_hrm_time_tracking_employee_contract } from "../../../prepare/prepare_random_hrm_time_tracking_employee_contract";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_employee_contract_update_single_active_invariant(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  const employees = await api.functional.hrmTimeTracking.employees.index(
    ownerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmTimeTrackingEmployee.IRequest,
    },
  );
  typia.assert(employees);
  TestValidator.predicate(
    "employee directory has at least one employee",
    employees.data.length > 0,
  );
  const employee = employees.data[0];
  typia.assert(employee);
  const originalStart = new Date("2026-01-01T00:00:00.000Z").toISOString();
  const originalContract =
    await generate_random_hrm_time_tracking_owner_employees_contracts_create(
      ownerConnection,
      {
        params: {
          employeeId: employee.id,
        },
        body: {
          start_date: originalStart,
          end_date: null,
          pay_rate: 25000,
          pay_period: "hourly",
          working_hours_per_week: 40,
          notes: "active contract before invalid update attempt",
        },
      },
    );
  typia.assert(originalContract);
  const invalidUpdate = {
    start_date: new Date("2026-03-01T00:00:00.000Z").toISOString(),
    end_date: new Date("2026-02-01T00:00:00.000Z").toISOString(),
    pay_rate: originalContract.pay_rate,
    pay_period: "hourly",
    working_hours_per_week: originalContract.working_hours_per_week,
    notes: originalContract.notes,
  } satisfies IHrmTimeTrackingEmployeeContract.IUpdate;
  await TestValidator.error(
    "reject contract update that breaks effective period integrity",
    async () => {
      await api.functional.hrmTimeTracking.owner.employees.contracts.update(
        ownerConnection,
        {
          employeeId: employee.id,
          contractId: originalContract.id,
          body: invalidUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "created contract start_date matches fixture",
    originalContract.start_date,
    originalStart,
  );
  TestValidator.equals(
    "created contract end_date remains open-ended in fixture",
    originalContract.end_date,
    null,
  );
  TestValidator.equals(
    "created contract pay_rate matches fixture",
    originalContract.pay_rate,
    25000,
  );
  TestValidator.equals(
    "created contract pay_period matches fixture",
    originalContract.pay_period,
    "hourly",
  );
  TestValidator.equals(
    "created contract working hours match fixture",
    originalContract.working_hours_per_week,
    40,
  );
  TestValidator.equals(
    "created contract notes match fixture",
    originalContract.notes,
    "active contract before invalid update attempt",
  );
}
