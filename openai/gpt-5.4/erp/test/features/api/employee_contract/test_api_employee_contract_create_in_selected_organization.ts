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

export async function test_api_employee_contract_create_in_selected_organization(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/hrm/owner/join",
      referrer: "https://example.com/hrm",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  const startDate = new Date().toISOString();
  const payPeriods = ["hourly", "daily", "weekly", "monthly"] as const;
  const payPeriod = RandomGenerator.pick(payPeriods);
  const body = {
    start_date: startDate,
    pay_rate: 37.5,
    pay_period: payPeriod,
    working_hours_per_week: 40,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHrmTimeTrackingEmployeeContract.ICreate;
  const contract =
    await generate_random_hrm_time_tracking_owner_employees_contracts_create(
      ownerConnection,
      {
        params: {
          employeeId: typia.random<string & tags.Format<"uuid">>(),
        },
        body,
      },
    );
  typia.assert(contract);
  TestValidator.notEquals("contract id is generated", contract.id, "");
  TestValidator.equals(
    "start date is echoed",
    contract.start_date,
    body.start_date,
  );
  TestValidator.equals(
    "end date remains null when omitted",
    contract.end_date,
    null,
  );
  TestValidator.equals("pay rate is echoed", contract.pay_rate, body.pay_rate);
  TestValidator.equals(
    "pay period is echoed",
    contract.pay_period,
    body.pay_period,
  );
  TestValidator.equals(
    "working hours per week is echoed",
    contract.working_hours_per_week,
    body.working_hours_per_week,
  );
  TestValidator.equals("notes are echoed", contract.notes, body.notes ?? null);
  TestValidator.notEquals("created at is populated", contract.created_at, "");
  TestValidator.notEquals("updated at is populated", contract.updated_at, "");
  TestValidator.equals("deleted at is null", contract.deleted_at, null);
}
