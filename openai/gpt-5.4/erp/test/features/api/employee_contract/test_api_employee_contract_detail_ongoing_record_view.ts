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

export async function test_api_employee_contract_detail_ongoing_record_view(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/hrm/contracts",
      referrer: "https://example.com/hrm",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    start_date: new Date("2026-01-01T09:00:00.000Z").toISOString(),
    end_date: null,
    pay_rate: 42.5,
    pay_period: "hourly",
    working_hours_per_week: 40,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHrmTimeTrackingEmployeeContract.ICreate;
  const created =
    await generate_random_hrm_time_tracking_manager_employees_contracts_create(
      managerConnection,
      {
        params: { employeeId },
        body,
      },
    );
  typia.assert(created);
  const detailed =
    await api.functional.hrmTimeTracking.manager.employees.contracts.at(
      managerConnection,
      {
        employeeId,
        contractId: created.id,
      },
    );
  typia.assert(detailed);
  TestValidator.equals("contract id preserved", detailed.id, created.id);
  TestValidator.equals(
    "contract start_date preserved",
    detailed.start_date,
    body.start_date,
  );
  TestValidator.equals(
    "ongoing contract end_date is null",
    detailed.end_date,
    null,
  );
  TestValidator.equals(
    "contract pay_rate preserved",
    detailed.pay_rate,
    body.pay_rate,
  );
  TestValidator.equals(
    "contract pay_period preserved",
    detailed.pay_period,
    body.pay_period,
  );
  TestValidator.equals(
    "contract working hours preserved",
    detailed.working_hours_per_week,
    body.working_hours_per_week,
  );
  TestValidator.equals(
    "contract notes preserved",
    detailed.notes,
    body.notes ?? null,
  );
  TestValidator.equals(
    "created_at unchanged by read",
    detailed.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "updated_at unchanged by read",
    detailed.updated_at,
    created.updated_at,
  );
  TestValidator.equals(
    "deleted_at unchanged by read",
    detailed.deleted_at,
    created.deleted_at,
  );
  TestValidator.equals(
    "detail matches created contract record",
    detailed,
    created,
  );
}
