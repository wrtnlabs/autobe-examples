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

export async function test_api_employee_contract_update_historical_contract_rejected(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingManager.IJoin,
  });
  typia.assert(managerAuth);
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const initialPayRate = 25;
  const initialPayPeriod = "hourly";
  const initialWorkingHours = 40;
  const initialNotes = RandomGenerator.paragraph({ sentences: 3 });
  const initialStartDate = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const originalContract =
    await generate_random_hrm_time_tracking_manager_employees_contracts_create(
      managerConnection,
      {
        params: {
          employeeId,
        },
        body: {
          start_date: initialStartDate,
          end_date: null,
          pay_rate: initialPayRate,
          pay_period: initialPayPeriod,
          working_hours_per_week: initialWorkingHours,
          notes: initialNotes,
        } satisfies IHrmTimeTrackingEmployeeContract.ICreate,
      },
    );
  typia.assert(originalContract);
  const snapshot = {
    pay_rate: originalContract.pay_rate,
    pay_period: originalContract.pay_period,
    working_hours_per_week: originalContract.working_hours_per_week,
    notes: originalContract.notes,
    end_date: originalContract.end_date,
  };
  const updateBody = {
    pay_rate: initialPayRate + 5,
    pay_period: "monthly",
    working_hours_per_week: initialWorkingHours - 5,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHrmTimeTrackingEmployeeContract.IUpdate;
  await TestValidator.httpError(
    "historical or non-editable employee contract update must be rejected",
    [400, 403, 404, 409, 422],
    async () => {
      await api.functional.hrmTimeTracking.manager.employees.contracts.update(
        managerConnection,
        {
          employeeId,
          contractId: originalContract.id,
          body: updateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "snapshot pay rate remains original reference",
    snapshot.pay_rate,
    initialPayRate,
  );
  TestValidator.equals(
    "snapshot pay period remains original reference",
    snapshot.pay_period,
    initialPayPeriod,
  );
  TestValidator.equals(
    "snapshot working hours remain original reference",
    snapshot.working_hours_per_week,
    initialWorkingHours,
  );
  TestValidator.equals(
    "snapshot notes remain original reference",
    snapshot.notes,
    initialNotes,
  );
  TestValidator.equals(
    "snapshot end date remains ongoing",
    snapshot.end_date,
    null,
  );
}
