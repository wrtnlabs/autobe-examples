import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_employees_contracts_create } from "../../../generate/generate_random_hrm_time_tracking_owner_employees_contracts_create";
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { prepare_random_hrm_time_tracking_employee_contract } from "../../../prepare/prepare_random_hrm_time_tracking_employee_contract";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_employee_contract_detail_access_rejected_for_mismatched_employee_scope(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `${RandomGenerator.name()} ${RandomGenerator.alphabets(4)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        },
      },
    );
  typia.assert(organization);
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(employeeAuth);
  const contractBody = {
    start_date: new Date().toISOString(),
    end_date: null,
    pay_rate: 42,
    pay_period: "hourly",
    working_hours_per_week: 40,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHrmTimeTrackingEmployeeContract.ICreate;
  const createdContract =
    await generate_random_hrm_time_tracking_owner_employees_contracts_create(
      ownerConnection,
      {
        params: {
          employeeId: employeeAuth.id,
        },
        body: contractBody,
      },
    );
  typia.assert(createdContract);
  const fetchedContract =
    await api.functional.hrmTimeTracking.owner.employees.contracts.at(
      ownerConnection,
      {
        employeeId: employeeAuth.id,
        contractId: createdContract.id,
      },
    );
  typia.assert(fetchedContract);
  TestValidator.equals(
    "contract id matches",
    fetchedContract.id,
    createdContract.id,
  );
  TestValidator.equals(
    "contract start date matches",
    fetchedContract.start_date,
    createdContract.start_date,
  );
  TestValidator.equals(
    "contract pay rate matches",
    fetchedContract.pay_rate,
    createdContract.pay_rate,
  );
  TestValidator.equals(
    "contract pay period matches",
    fetchedContract.pay_period,
    createdContract.pay_period,
  );
  TestValidator.equals(
    "contract weekly hours match",
    fetchedContract.working_hours_per_week,
    createdContract.working_hours_per_week,
  );
  TestValidator.equals(
    "contract notes match",
    fetchedContract.notes,
    createdContract.notes,
  );
  const mismatchedEmployeeId = (() => {
    let candidate = typia.random<string & tags.Format<"uuid">>();
    while (candidate === employeeAuth.id) {
      candidate = typia.random<string & tags.Format<"uuid">>();
    }
    return candidate;
  })();
  await TestValidator.httpError(
    "rejects contract detail access for mismatched employee scope",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.owner.employees.contracts.at(
        ownerConnection,
        {
          employeeId: mismatchedEmployeeId,
          contractId: createdContract.id,
        },
      );
    },
  );
}
