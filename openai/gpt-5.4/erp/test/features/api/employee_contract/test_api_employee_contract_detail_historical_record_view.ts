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

export async function test_api_employee_contract_detail_historical_record_view(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/hrm/contracts/history",
      referrer: "https://example.com/hrm",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const initialStartDate = new Date("2025-01-01T00:00:00.000Z");
  const initialEndDate = new Date("2025-01-31T23:59:59.999Z");
  const initialBody = {
    start_date: initialStartDate.toISOString(),
    end_date: initialEndDate.toISOString(),
    pay_rate: 42.5,
    pay_period: "hourly",
    working_hours_per_week: 40,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHrmTimeTrackingEmployeeContract.ICreate;
  const historicalContract =
    await generate_random_hrm_time_tracking_manager_employees_contracts_create(
      managerConnection,
      {
        params: { employeeId },
        body: initialBody,
      },
    );
  typia.assert(historicalContract);
  const found =
    await api.functional.hrmTimeTracking.manager.employees.contracts.at(
      managerConnection,
      {
        employeeId,
        contractId: historicalContract.id,
      },
    );
  typia.assert(found);
  TestValidator.equals(
    "contract id preserved",
    found.id,
    historicalContract.id,
  );
  TestValidator.equals(
    "contract start date preserved",
    found.start_date,
    historicalContract.start_date,
  );
  TestValidator.notEquals("historical end date exists", found.end_date, null);
  TestValidator.equals(
    "contract end date preserved",
    found.end_date,
    historicalContract.end_date,
  );
  TestValidator.equals(
    "pay rate preserved",
    found.pay_rate,
    historicalContract.pay_rate,
  );
  TestValidator.equals(
    "pay period preserved",
    found.pay_period,
    historicalContract.pay_period,
  );
  TestValidator.equals(
    "working hours preserved",
    found.working_hours_per_week,
    historicalContract.working_hours_per_week,
  );
  TestValidator.equals(
    "notes preserved",
    found.notes,
    historicalContract.notes,
  );
}
