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

export async function test_api_employee_contract_detail_ongoing_contract_null_end_date(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const contractInput = {
    start_date: new Date().toISOString(),
    end_date: null,
    pay_rate: 37.5,
    pay_period: "hourly",
    working_hours_per_week: 40,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHrmTimeTrackingEmployeeContract.ICreate;
  const created =
    await generate_random_hrm_time_tracking_owner_employees_contracts_create(
      ownerConnection,
      {
        params: {
          employeeId,
        },
        body: contractInput,
      },
    );
  typia.assert(created);
  const detailed =
    await api.functional.hrmTimeTracking.owner.employees.contracts.at(
      ownerConnection,
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
    contractInput.start_date,
  );
  TestValidator.equals(
    "contract end_date remains null",
    detailed.end_date,
    null,
  );
  TestValidator.equals(
    "contract pay_rate preserved",
    detailed.pay_rate,
    contractInput.pay_rate,
  );
  TestValidator.equals(
    "contract pay_period preserved",
    detailed.pay_period,
    contractInput.pay_period,
  );
  TestValidator.equals(
    "contract working_hours_per_week preserved",
    detailed.working_hours_per_week,
    contractInput.working_hours_per_week,
  );
  TestValidator.equals(
    "contract notes preserved",
    detailed.notes,
    contractInput.notes ?? null,
  );
}
