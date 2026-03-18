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

export async function test_api_employee_contract_delete_mismatched_employee_contract_rejected(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = {
    host: connection.host,
  };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingManager.IJoin;
  const authorized = await authorize_manager_join(managerConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const originalEmployeeId = typia.random<string & tags.Format<"uuid">>();
  const mismatchedEmployeeId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.notEquals(
    "employee ids must differ",
    originalEmployeeId,
    mismatchedEmployeeId,
  );
  const created =
    await generate_random_hrm_time_tracking_manager_employees_contracts_create(
      managerConnection,
      {
        params: {
          employeeId: originalEmployeeId,
        },
        body: {
          start_date: new Date().toISOString(),
          end_date: null,
          pay_rate: 42,
          pay_period: "hourly",
          working_hours_per_week: 40,
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmTimeTrackingEmployeeContract.ICreate,
      },
    );
  typia.assert(created);
  await TestValidator.httpError(
    "mismatched employee contract delete is rejected as not found",
    404,
    async () => {
      await api.functional.hrmTimeTracking.manager.employees.contracts.erase(
        managerConnection,
        {
          employeeId: mismatchedEmployeeId,
          contractId: created.id,
        },
      );
    },
  );
  await api.functional.hrmTimeTracking.manager.employees.contracts.erase(
    managerConnection,
    {
      employeeId: originalEmployeeId,
      contractId: created.id,
    },
  );
}
