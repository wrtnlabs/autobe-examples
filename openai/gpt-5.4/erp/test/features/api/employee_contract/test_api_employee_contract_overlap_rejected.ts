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

export async function test_api_employee_contract_overlap_rejected(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingManager.IAuthorized =
    await authorize_manager_join(managerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/hrm/contracts",
        referrer: "https://example.com/hrm",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(authorized);
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const originalBody = {
    start_date: "2026-01-01T00:00:00.000Z",
    end_date: null,
    pay_rate: 42,
    pay_period: "hourly",
    working_hours_per_week: 40,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHrmTimeTrackingEmployeeContract.ICreate;
  const created: IHrmTimeTrackingEmployeeContract =
    await generate_random_hrm_time_tracking_manager_employees_contracts_create(
      managerConnection,
      {
        params: { employeeId },
        body: originalBody,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "created contract start_date matches request",
    created.start_date,
    originalBody.start_date,
  );
  TestValidator.equals(
    "created contract end_date matches request",
    created.end_date,
    originalBody.end_date ?? null,
  );
  TestValidator.equals(
    "created contract pay_rate matches request",
    created.pay_rate,
    originalBody.pay_rate,
  );
  TestValidator.equals(
    "created contract pay_period matches request",
    created.pay_period,
    originalBody.pay_period,
  );
  TestValidator.equals(
    "created contract working hours match request",
    created.working_hours_per_week,
    originalBody.working_hours_per_week,
  );
  TestValidator.equals(
    "created contract notes match request",
    created.notes,
    originalBody.notes ?? null,
  );
  const overlappingBody = {
    start_date: "2026-06-01T00:00:00.000Z",
    end_date: "2026-12-31T23:59:59.999Z",
    pay_rate: 55,
    pay_period: "hourly",
    working_hours_per_week: 35,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHrmTimeTrackingEmployeeContract.ICreate;
  await TestValidator.error(
    "rejects overlapping employee contract for same employee",
    async () => {
      await generate_random_hrm_time_tracking_manager_employees_contracts_create(
        managerConnection,
        {
          params: { employeeId },
          body: overlappingBody,
        },
      );
    },
  );
  TestValidator.equals(
    "original created contract remains unchanged start_date",
    created.start_date,
    originalBody.start_date,
  );
  TestValidator.equals(
    "original created contract remains unchanged end_date",
    created.end_date,
    originalBody.end_date ?? null,
  );
  TestValidator.equals(
    "original created contract remains unchanged pay_rate",
    created.pay_rate,
    originalBody.pay_rate,
  );
  TestValidator.equals(
    "original created contract remains unchanged pay_period",
    created.pay_period,
    originalBody.pay_period,
  );
  TestValidator.equals(
    "original created contract remains unchanged working hours",
    created.working_hours_per_week,
    originalBody.working_hours_per_week,
  );
  TestValidator.equals(
    "original created contract remains unchanged notes",
    created.notes,
    originalBody.notes ?? null,
  );
}
