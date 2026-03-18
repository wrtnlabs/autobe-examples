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

export async function test_api_employee_contract_detail_scope_rejection(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const ownerEmployeeId = typia.random<string & tags.Format<"uuid">>();
  const anotherEmployeeId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.notEquals(
    "different employee ids are used",
    ownerEmployeeId,
    anotherEmployeeId,
  );
  const contractBody = {
    start_date: new Date().toISOString(),
    end_date: null,
    pay_rate: 42,
    pay_period: "hourly",
    working_hours_per_week: 40,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHrmTimeTrackingEmployeeContract.ICreate;
  const created =
    await generate_random_hrm_time_tracking_manager_employees_contracts_create(
      managerConnection,
      {
        params: {
          employeeId: ownerEmployeeId,
        },
        body: contractBody,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "contract start date matches input",
    created.start_date,
    contractBody.start_date,
  );
  TestValidator.equals(
    "contract pay rate matches input",
    created.pay_rate,
    contractBody.pay_rate,
  );
  TestValidator.equals(
    "contract pay period matches input",
    created.pay_period,
    contractBody.pay_period,
  );
  TestValidator.equals(
    "contract working hours match input",
    created.working_hours_per_week,
    contractBody.working_hours_per_week,
  );
  TestValidator.equals(
    "contract notes match input",
    created.notes,
    contractBody.notes,
  );
  await TestValidator.httpError(
    "rejects contract lookup with mismatched employeeId",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.manager.employees.contracts.at(
        managerConnection,
        {
          employeeId: anotherEmployeeId,
          contractId: created.id,
        },
      );
    },
  );
}
