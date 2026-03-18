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

export async function test_api_employee_contract_update_overlapping_active_period_rejected(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingManager.IAuthorized =
    await authorize_manager_join(managerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(authorized);
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const targetBody = {
    start_date: new Date(now - 30 * day).toISOString(),
    end_date: new Date(now - 1 * day).toISOString(),
    pay_rate: 31,
    pay_period: "hourly",
    working_hours_per_week: 40,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHrmTimeTrackingEmployeeContract.ICreate;
  const targetContract: IHrmTimeTrackingEmployeeContract =
    await generate_random_hrm_time_tracking_manager_employees_contracts_create(
      managerConnection,
      {
        params: { employeeId },
        body: targetBody,
      },
    );
  typia.assert(targetContract);
  const activeBody = {
    start_date: new Date(now).toISOString(),
    end_date: null,
    pay_rate: 47,
    pay_period: "hourly",
    working_hours_per_week: 38,
    notes: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IHrmTimeTrackingEmployeeContract.ICreate;
  const activeContract: IHrmTimeTrackingEmployeeContract =
    await generate_random_hrm_time_tracking_manager_employees_contracts_create(
      managerConnection,
      {
        params: { employeeId },
        body: activeBody,
      },
    );
  typia.assert(activeContract);
  TestValidator.notEquals(
    "distinct contract ids",
    targetContract.id,
    activeContract.id,
  );
  TestValidator.equals(
    "target original start_date",
    targetContract.start_date,
    targetBody.start_date,
  );
  TestValidator.equals(
    "target original end_date",
    targetContract.end_date,
    targetBody.end_date,
  );
  TestValidator.equals(
    "target original pay_rate",
    targetContract.pay_rate,
    targetBody.pay_rate,
  );
  TestValidator.equals(
    "target original pay_period",
    targetContract.pay_period,
    targetBody.pay_period,
  );
  TestValidator.equals(
    "target original working_hours_per_week",
    targetContract.working_hours_per_week,
    targetBody.working_hours_per_week,
  );
  TestValidator.equals(
    "target original notes",
    targetContract.notes,
    targetBody.notes,
  );
  TestValidator.equals(
    "active original start_date",
    activeContract.start_date,
    activeBody.start_date,
  );
  TestValidator.equals(
    "active original end_date",
    activeContract.end_date,
    activeBody.end_date,
  );
  TestValidator.equals(
    "active original pay_rate",
    activeContract.pay_rate,
    activeBody.pay_rate,
  );
  TestValidator.equals(
    "active original pay_period",
    activeContract.pay_period,
    activeBody.pay_period,
  );
  TestValidator.equals(
    "active original working_hours_per_week",
    activeContract.working_hours_per_week,
    activeBody.working_hours_per_week,
  );
  TestValidator.equals(
    "active original notes",
    activeContract.notes,
    activeBody.notes,
  );
  const conflictingUpdate = {
    start_date: new Date(now - 10 * day).toISOString(),
    end_date: null,
    pay_period: "hourly",
  } satisfies IHrmTimeTrackingEmployeeContract.IUpdate;
  await TestValidator.error(
    "reject overlapping active contract update",
    async () => {
      await api.functional.hrmTimeTracking.manager.employees.contracts.update(
        managerConnection,
        {
          employeeId,
          contractId: targetContract.id,
          body: conflictingUpdate,
        },
      );
    },
  );
  TestValidator.notEquals(
    "contracts remain distinct after rejection",
    targetContract,
    activeContract,
  );
  TestValidator.equals(
    "target start_date preserved after rejection",
    targetContract.start_date,
    targetBody.start_date,
  );
  TestValidator.equals(
    "target end_date preserved after rejection",
    targetContract.end_date,
    targetBody.end_date,
  );
  TestValidator.equals(
    "target pay_rate preserved after rejection",
    targetContract.pay_rate,
    targetBody.pay_rate,
  );
  TestValidator.equals(
    "target pay_period preserved after rejection",
    targetContract.pay_period,
    targetBody.pay_period,
  );
  TestValidator.equals(
    "target working_hours_per_week preserved after rejection",
    targetContract.working_hours_per_week,
    targetBody.working_hours_per_week,
  );
  TestValidator.equals(
    "target notes preserved after rejection",
    targetContract.notes,
    targetBody.notes,
  );
  TestValidator.equals(
    "active start_date preserved after rejection",
    activeContract.start_date,
    activeBody.start_date,
  );
  TestValidator.equals(
    "active end_date preserved after rejection",
    activeContract.end_date,
    activeBody.end_date,
  );
  TestValidator.equals(
    "active pay_rate preserved after rejection",
    activeContract.pay_rate,
    activeBody.pay_rate,
  );
  TestValidator.equals(
    "active pay_period preserved after rejection",
    activeContract.pay_period,
    activeBody.pay_period,
  );
  TestValidator.equals(
    "active working_hours_per_week preserved after rejection",
    activeContract.working_hours_per_week,
    activeBody.working_hours_per_week,
  );
  TestValidator.equals(
    "active notes preserved after rejection",
    activeContract.notes,
    activeBody.notes,
  );
}
