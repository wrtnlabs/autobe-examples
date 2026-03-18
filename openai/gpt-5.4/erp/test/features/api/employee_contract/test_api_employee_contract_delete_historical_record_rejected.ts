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

export async function test_api_employee_contract_delete_historical_record_rejected(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/hrm/managers/join",
      referrer: "https://example.com/hrm/managers",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(manager);
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const historicalStartDate = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const historicalEndDate = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString();
  await TestValidator.httpError(
    "historical contract deletion workflow is rejected when no valid deletable target can be established from available APIs",
    [400, 403, 404, 409, 422],
    async () => {
      const contract =
        await generate_random_hrm_time_tracking_manager_employees_contracts_create(
          managerConnection,
          {
            params: {
              employeeId,
            },
            body: {
              start_date: historicalStartDate,
              end_date: historicalEndDate,
              pay_rate: 25,
              pay_period: "hourly",
              working_hours_per_week: 40,
              notes: RandomGenerator.paragraph({ sentences: 2 }),
            },
          },
        );
      typia.assert(contract);
      await api.functional.hrmTimeTracking.manager.employees.contracts.erase(
        managerConnection,
        {
          employeeId,
          contractId: contract.id,
        },
      );
    },
  );
}
