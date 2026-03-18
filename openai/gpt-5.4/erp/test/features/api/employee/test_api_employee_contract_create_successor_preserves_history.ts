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

export async function test_api_employee_contract_create_successor_preserves_history(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const earlierStart = new Date("2024-01-01T00:00:00.000Z");
  const earlierEnd = new Date("2024-06-30T23:59:59.000Z");
  const successorStart = new Date("2024-07-01T00:00:00.000Z");
  const earlierBody = {
    start_date: earlierStart.toISOString(),
    end_date: earlierEnd.toISOString(),
    pay_rate: 32000,
    pay_period: "hourly",
    working_hours_per_week: 40,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHrmTimeTrackingEmployeeContract.ICreate;
  const earlierContract =
    await generate_random_hrm_time_tracking_manager_employees_contracts_create(
      managerConnection,
      {
        params: { employeeId },
        body: earlierBody,
      },
    );
  typia.assert(earlierContract);
  const earlierSnapshot = {
    id: earlierContract.id,
    start_date: earlierContract.start_date,
    end_date: earlierContract.end_date,
    pay_rate: earlierContract.pay_rate,
    pay_period: earlierContract.pay_period,
    working_hours_per_week: earlierContract.working_hours_per_week,
    notes: earlierContract.notes,
    created_at: earlierContract.created_at,
    updated_at: earlierContract.updated_at,
    deleted_at: earlierContract.deleted_at,
  } satisfies IHrmTimeTrackingEmployeeContract;
  const successorBody = {
    start_date: successorStart.toISOString(),
    end_date: null,
    pay_rate: 41000,
    pay_period: "monthly",
    working_hours_per_week: 35,
    notes: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IHrmTimeTrackingEmployeeContract.ICreate;
  const successorContract =
    await generate_random_hrm_time_tracking_manager_employees_contracts_create(
      managerConnection,
      {
        params: { employeeId },
        body: successorBody,
      },
    );
  typia.assert(successorContract);
  TestValidator.equals(
    "earlier contract snapshot preserved after successor creation",
    earlierContract,
    earlierSnapshot,
  );
  TestValidator.notEquals(
    "successor contract has a different id",
    successorContract.id,
    earlierContract.id,
  );
  TestValidator.equals(
    "successor start date matches request",
    successorContract.start_date,
    successorBody.start_date,
  );
  TestValidator.equals(
    "successor end date remains open",
    successorContract.end_date,
    successorBody.end_date,
  );
  TestValidator.equals(
    "successor pay rate matches request",
    successorContract.pay_rate,
    successorBody.pay_rate,
  );
  TestValidator.equals(
    "successor pay period matches request",
    successorContract.pay_period,
    successorBody.pay_period,
  );
  TestValidator.equals(
    "successor working hours match request",
    successorContract.working_hours_per_week,
    successorBody.working_hours_per_week,
  );
  TestValidator.equals(
    "successor notes match request",
    successorContract.notes,
    successorBody.notes,
  );
  TestValidator.equals(
    "earlier contract start date preserved",
    earlierContract.start_date,
    earlierBody.start_date,
  );
  TestValidator.equals(
    "earlier contract end date preserved",
    earlierContract.end_date,
    earlierBody.end_date,
  );
  TestValidator.equals(
    "earlier contract pay rate preserved",
    earlierContract.pay_rate,
    earlierBody.pay_rate,
  );
  TestValidator.equals(
    "earlier contract pay period preserved",
    earlierContract.pay_period,
    earlierBody.pay_period,
  );
  TestValidator.equals(
    "earlier contract working hours preserved",
    earlierContract.working_hours_per_week,
    earlierBody.working_hours_per_week,
  );
  TestValidator.equals(
    "earlier contract notes preserved",
    earlierContract.notes,
    earlierBody.notes,
  );
  TestValidator.predicate(
    "successor starts after earlier contract ends",
    new Date(successorBody.start_date).getTime() >
      new Date(earlierBody.end_date ?? earlierBody.start_date).getTime(),
  );
}
