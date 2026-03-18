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

export async function test_api_employee_contract_delete_nested_employee_mismatch_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(authorized);
  const realEmployeeId = typia.random<string & tags.Format<"uuid">>();
  const mismatchedEmployeeId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.notEquals(
    "mismatched employee path must differ from real employee",
    realEmployeeId,
    mismatchedEmployeeId,
  );
  const contract: IHrmTimeTrackingEmployeeContract =
    await generate_random_hrm_time_tracking_owner_employees_contracts_create(
      ownerConnection,
      {
        params: {
          employeeId: realEmployeeId,
        },
        body: {
          start_date: new Date().toISOString(),
          end_date: null,
          pay_rate: 25,
          pay_period: "hourly",
          working_hours_per_week: 40,
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmTimeTrackingEmployeeContract.ICreate,
      },
    );
  typia.assert(contract);
  TestValidator.notEquals(
    "contract id is distinct from mismatched employee id",
    contract.id,
    mismatchedEmployeeId,
  );
  await TestValidator.httpError(
    "delete rejects contract when employee path does not own it",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.owner.employees.contracts.erase(
        ownerConnection,
        {
          employeeId: mismatchedEmployeeId,
          contractId: contract.id,
        },
      );
    },
  );
}
