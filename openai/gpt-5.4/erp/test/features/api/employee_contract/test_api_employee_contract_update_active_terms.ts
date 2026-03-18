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

export async function test_api_employee_contract_update_active_terms(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingManager.IJoin,
  });
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const startDate = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const initialContract =
    await generate_random_hrm_time_tracking_manager_employees_contracts_create(
      managerConnection,
      {
        params: {
          employeeId,
        },
        body: {
          start_date: startDate,
          pay_rate: 25,
          pay_period: "hourly",
          working_hours_per_week: 40,
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmTimeTrackingEmployeeContract.ICreate,
      },
    );
  typia.assert(initialContract);
  const revisedEndDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const updateBody = {
    pay_rate: 32,
    pay_period: "weekly",
    working_hours_per_week: 36,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
    end_date: revisedEndDate,
  } satisfies IHrmTimeTrackingEmployeeContract.IUpdate;
  const updatedContract =
    await api.functional.hrmTimeTracking.manager.employees.contracts.update(
      managerConnection,
      {
        employeeId,
        contractId: initialContract.id,
        body: updateBody,
      },
    );
  typia.assert(updatedContract);
  TestValidator.equals(
    "contract identity preserved",
    updatedContract.id,
    initialContract.id,
  );
  TestValidator.equals(
    "created_at preserved",
    updatedContract.created_at,
    initialContract.created_at,
  );
  TestValidator.notEquals(
    "updated_at advanced",
    updatedContract.updated_at,
    initialContract.updated_at,
  );
  TestValidator.equals(
    "start_date unchanged",
    updatedContract.start_date,
    initialContract.start_date,
  );
  TestValidator.equals(
    "pay_rate updated",
    updatedContract.pay_rate,
    updateBody.pay_rate,
  );
  TestValidator.equals(
    "pay_period updated",
    updatedContract.pay_period,
    updateBody.pay_period,
  );
  TestValidator.equals(
    "working hours updated",
    updatedContract.working_hours_per_week,
    updateBody.working_hours_per_week,
  );
  TestValidator.equals(
    "notes updated",
    updatedContract.notes,
    updateBody.notes,
  );
  TestValidator.equals(
    "end_date updated",
    updatedContract.end_date,
    updateBody.end_date,
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedContract.deleted_at,
    null,
  );
}
