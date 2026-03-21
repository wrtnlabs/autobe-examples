import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_member_employees_contracts_create";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";

export async function test_api_contract_update_historical_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated member with owner role
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(owner);
  // Step 2: Create an employee record
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        employmentType: "full_time",
      },
    },
  );
  typia.assert(employee);
  // Step 3: Create a historical contract (both start_date and end_date in the past)
  const now = new Date();
  const startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
  const endDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const historicalContract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      ownerConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: startDate.toISOString() satisfies string &
            tags.Format<"date-time">,
          end_date: endDate.toISOString() satisfies string &
            tags.Format<"date-time">,
          pay_rate: 50000,
          pay_period: "monthly",
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(historicalContract);
  // Step 4: Attempt to update the historical contract - should be rejected with 409 Conflict
  await TestValidator.httpError(
    "historical contract update should be rejected",
    409,
    async () => {
      await api.functional.erpHrm.member.employees.contracts.update(
        ownerConnection,
        {
          employeeId: employee.id,
          contractId: historicalContract.id,
          body: {
            pay_rate: 60000,
          } satisfies IErpHrmContract.IUpdate,
        },
      );
    },
  );
}
