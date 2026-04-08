import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_employees_contracts_create } from "../../../generate/generate_random_hrm_member_employees_contracts_create";
import { generate_random_hrm_member_invitations_create } from "../../../generate/generate_random_hrm_member_invitations_create";
import { prepare_random_hrm_contract } from "../../../prepare/prepare_random_hrm_contract";
import { prepare_random_hrm_employee_invitation } from "../../../prepare/prepare_random_hrm_employee_invitation";

/**
 * Test contract creation for an employee with no existing contract.
 *
 * Validates the primary success path for creating an employment contract when an employee has no prior contracts. Ensures the contract is properly created with correct compensation terms, effective dates, and system-generated fields.
 *
 * Note: This test uses a generated employeeId since the available SDK does not include employee query APIs to retrieve the employee record after invitation acceptance. In a complete test suite, the employee would be created through the invitation flow and retrieved before contract creation.
 *
 * The test focuses on validating the contract creation endpoint behavior with valid input data, ensuring proper handling of compensation terms, effective dates, and active contract status.
 *
 * 1. Authenticate as member with employee:manage permission.
 * 2. Generate valid employeeId for contract creation.
 * 3. Create employment contract with future start date and hourly pay rate.
 * 4. Validates contract contains all required fields and active status (end_date is null).
 */
export async function test_api_contract_creation_first_contract(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with employee:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate employeeId for contract creation
  // Note: In a complete flow, this would come from an actual employee record
  // created through the invitation acceptance process
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create employment contract with future start date
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const contract = await generate_random_hrm_member_employees_contracts_create(
    memberConnection,
    {
      params: {
        employeeId,
      },
      body: {
        start_date: futureDate.toISOString() as string & tags.Format<"date-time">,
        pay_rate: 50.0,
        pay_period: "hourly",
        working_hours_per_week: 40.0,
        notes: "Test contract for E2E validation",
      } satisfies IHrmContract.ICreate,
    },
  );
  typia.assert(contract);
  // 4. Validate contract creation
  TestValidator.predicate("contract has valid id", contract.id.length > 0);
  TestValidator.equals(
    "start_date matches",
    contract.start_date,
    futureDate.toISOString(),
  );
  TestValidator.equals("pay_rate matches", contract.pay_rate, 50.0);
  TestValidator.equals("pay_period matches", contract.pay_period, "hourly");
  TestValidator.equals(
    "working_hours_per_week matches",
    contract.working_hours_per_week,
    40.0,
  );
  TestValidator.predicate(
    "end_date is null for active contract",
    contract.end_date === null,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    contract.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    contract.updated_at.length > 0,
  );
}
