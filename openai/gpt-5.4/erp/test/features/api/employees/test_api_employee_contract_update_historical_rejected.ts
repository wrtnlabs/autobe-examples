import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
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
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { prepare_random_hrm_time_tracking_employee_contract } from "../../../prepare/prepare_random_hrm_time_tracking_employee_contract";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_employee_contract_update_historical_rejected(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Corrected E2E scope:
   * Employee creation and contract-history retrieval APIs are not available in the
   * provided materials, so this test verifies the core business rule that a
   * closed historical contract cannot be updated after creation.
   */
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `Org ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const historicalStart = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 90,
  ).toISOString();
  const historicalEnd = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const historicalContractInput = {
    start_date: historicalStart,
    end_date: historicalEnd,
    pay_rate: 25,
    pay_period: "hourly",
    working_hours_per_week: 40,
    notes: "historical contract",
  } satisfies IHrmTimeTrackingEmployeeContract.ICreate;
  const historicalContract =
    await generate_random_hrm_time_tracking_owner_employees_contracts_create(
      ownerConnection,
      {
        params: {
          employeeId,
        },
        body: historicalContractInput,
      },
    );
  typia.assert(historicalContract);
  const updateInput = {
    start_date: new Date(
      now.getTime() - 1000 * 60 * 60 * 24 * 120,
    ).toISOString(),
    end_date: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    pay_rate: 99,
    pay_period: "monthly",
    working_hours_per_week: 20,
    notes: "attempted historical edit",
  } satisfies IHrmTimeTrackingEmployeeContract.IUpdate;
  await TestValidator.error(
    "historical contract update must be rejected",
    async () => {
      await api.functional.hrmTimeTracking.owner.employees.contracts.update(
        ownerConnection,
        {
          employeeId,
          contractId: historicalContract.id,
          body: updateInput,
        },
      );
    },
  );
  TestValidator.equals(
    "historical contract start date preserved in created record",
    historicalContract.start_date,
    historicalContractInput.start_date,
  );
  TestValidator.equals(
    "historical contract end date preserved in created record",
    historicalContract.end_date,
    historicalContractInput.end_date ?? null,
  );
  TestValidator.equals(
    "historical contract pay rate preserved in created record",
    historicalContract.pay_rate,
    historicalContractInput.pay_rate,
  );
  TestValidator.equals(
    "historical contract pay period preserved in created record",
    historicalContract.pay_period,
    historicalContractInput.pay_period,
  );
  TestValidator.equals(
    "historical contract weekly hours preserved in created record",
    historicalContract.working_hours_per_week,
    historicalContractInput.working_hours_per_week,
  );
  TestValidator.equals(
    "historical contract notes preserved in created record",
    historicalContract.notes,
    historicalContractInput.notes ?? null,
  );
}
