import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_employees_contracts_create } from "../../../generate/generate_random_hrm_time_tracking_owner_employees_contracts_create";
import { prepare_random_hrm_time_tracking_employee_contract } from "../../../prepare/prepare_random_hrm_time_tracking_employee_contract";

export async function test_api_employee_contract_delete_eligible_current_record(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const startDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
  const payPeriods = ["hourly", "daily", "weekly", "monthly"] as const;
  const createBody = {
    start_date: startDate,
    end_date: null,
    pay_rate: 25,
    pay_period: RandomGenerator.pick(payPeriods),
    working_hours_per_week: 40,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHrmTimeTrackingEmployeeContract.ICreate;
  const contract =
    await generate_random_hrm_time_tracking_owner_employees_contracts_create(
      ownerConnection,
      {
        params: {
          employeeId,
        },
        body: createBody,
      },
    );
  typia.assert(contract);
  TestValidator.equals(
    "contract start date matches request",
    contract.start_date,
    createBody.start_date,
  );
  TestValidator.equals(
    "contract end date matches request",
    contract.end_date,
    createBody.end_date ?? null,
  );
  TestValidator.equals(
    "contract pay rate matches request",
    contract.pay_rate,
    createBody.pay_rate,
  );
  TestValidator.equals(
    "contract pay period matches request",
    contract.pay_period,
    createBody.pay_period,
  );
  TestValidator.equals(
    "contract working hours match request",
    contract.working_hours_per_week,
    createBody.working_hours_per_week,
  );
  TestValidator.equals(
    "contract notes match request",
    contract.notes,
    createBody.notes ?? null,
  );
  TestValidator.notEquals(
    "contract id must differ from employee id",
    contract.id,
    employeeId,
  );
  await api.functional.hrmTimeTracking.owner.employees.contracts.erase(
    ownerConnection,
    {
      employeeId,
      contractId: contract.id,
    },
  );
  await TestValidator.error("repeated deletion should fail", async () => {
    await api.functional.hrmTimeTracking.owner.employees.contracts.erase(
      ownerConnection,
      {
        employeeId,
        contractId: contract.id,
      },
    );
  });
}
