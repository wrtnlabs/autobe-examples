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
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";

/**
 * Test that creating a contract for a non-existent employee returns a 404 not-found error.
 *
 * Validates the business-level existence check that the system performs before creating employment contracts. When a contract creation request targets an employee ID that does not exist in the current organization, the system must reject the request with a 404 not-found error rather than creating an orphaned contract record. The test authenticates a member with full permissions and then attempts to create a contract using a randomly generated UUID that does not correspond to any employee, providing valid contract fields including a positive pay rate, valid pay period enumeration, positive working hours per week, and a valid start date.
 *
 * 1. A new member registers and is authenticated via authorize_member_join, gaining the Owner role with employee:manage permission.
 * 2. A random non-existent employee UUID is generated using typia.random.
 * 3. Valid contract creation payload is prepared with a positive pay_rate, a valid pay_period value selected from the allowed enumeration, a positive working_hours_per_week, and a current start_date in ISO date-time format.
 * 4. The contract creation endpoint is called with the non-existent employee ID and the system returns a 404 not-found HTTP error, confirming the existence check is enforced.
 */
export async function test_api_contract_creation_employee_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate non-existent employee UUID
  const nonExistentEmployeeId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare valid contract body
  const payPeriods = ["hourly", "daily", "weekly", "monthly"] as const;
  const contractBody = {
    start_date: new Date().toISOString(),
    pay_rate: 50000,
    pay_period: RandomGenerator.pick(payPeriods),
    working_hours_per_week: 40,
  } satisfies IErpHrmContract.ICreate;
  // 4. Expect 404 when creating contract for non-existent employee
  await TestValidator.httpError(
    "contract creation for non-existent employee returns 404",
    404,
    async () =>
      api.functional.erpHrm.member.employees.contracts.create(
        memberConnection,
        {
          employeeId: nonExistentEmployeeId,
          body: contractBody,
        },
      ),
  );
}
