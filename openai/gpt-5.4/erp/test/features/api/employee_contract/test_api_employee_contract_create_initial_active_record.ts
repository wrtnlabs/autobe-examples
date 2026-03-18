import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";
import { generate_random_hrm_time_tracking_manager_employees_contracts_create } from "../../../generate/generate_random_hrm_time_tracking_manager_employees_contracts_create";
import { prepare_random_hrm_time_tracking_employee_contract } from "../../../prepare/prepare_random_hrm_time_tracking_employee_contract";

export async function test_api_employee_contract_create_initial_active_record(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/hrm/manager/contracts",
      referrer: "https://example.com/hrm/manager",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(manager);
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const startDate = new Date().toISOString();
  const notes = RandomGenerator.paragraph({ sentences: 2 });
  const payPeriodOptions = ["hourly", "daily", "weekly", "monthly"] as const;
  const payload = {
    start_date: startDate,
    pay_rate: 42.5,
    pay_period: RandomGenerator.pick(payPeriodOptions),
    working_hours_per_week: 40,
    notes,
  } satisfies IHrmTimeTrackingEmployeeContract.ICreate;
  const contract =
    await generate_random_hrm_time_tracking_manager_employees_contracts_create(
      managerConnection,
      {
        params: {
          employeeId,
        },
        body: payload,
      },
    );
  typia.assert(contract);
  TestValidator.notEquals(
    "contract id should be distinct from manager id",
    contract.id,
    manager.id,
  );
  TestValidator.equals(
    "start date preserved",
    contract.start_date,
    payload.start_date,
  );
  TestValidator.equals(
    "pay rate preserved",
    contract.pay_rate,
    payload.pay_rate,
  );
  TestValidator.equals(
    "pay period preserved",
    contract.pay_period,
    payload.pay_period,
  );
  TestValidator.equals(
    "working hours per week preserved",
    contract.working_hours_per_week,
    payload.working_hours_per_week,
  );
  TestValidator.equals(
    "notes preserved",
    contract.notes,
    payload.notes ?? null,
  );
  TestValidator.equals(
    "ongoing contract has null end date",
    contract.end_date,
    null,
  );
  TestValidator.equals(
    "deleted at is null for active contract",
    contract.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at is populated",
    contract.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is populated",
    contract.updated_at.length > 0,
  );
}
