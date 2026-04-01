import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_contracts_create } from "../../../generate/generate_random_hrm_platform_member_employees_contracts_create";
import { prepare_random_hrm_platform_employee_contract } from "../../../prepare/prepare_random_hrm_platform_employee_contract";

/**
 * Test creating an employment contract with ongoing status (no end date specified).
 *
 * **Prerequisites:**
 * - Member authentication via join endpoint
 * - An employee ID (will use randomly generated UUID for testing)
 *
 * **Success Path:**
 * 1. Authenticate as a member using authorize_member_join utility
 * 2. Create a contract without specifying end_date (null) for an employee
 * 3. Verify the contract is created with end_date as null indicating ongoing employment
 * 4. Verify all required fields are properly stored (start_date, pay_rate, pay_period, working_hours_per_week)
 * 5. Verify optional notes field can be included with contract terms
 *
 * **Validation Points:**
 * - Verify end_date field is null in the created contract
 * - Verify the contract is immediately active (deleted_at is null)
 * - Verify all required fields match input values
 * - Verify the employee relation is correctly linked in the response
 *
 * **Business Logic:**
 * - Ongoing contracts (null end_date) represent current employment
 * - Contract creation requires employee:manage permission (handled by member auth)
 * - Contract creation is logged in activity trail (server-side)
 *
 * **Expected Outcomes:**
 * - Contract created successfully with null end_date
 * - Contract shows as active (deleted_at is null)
 * - All input values are correctly stored and returned
 */
export async function test_api_employee_contract_ongoing_contract_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Prepare contract data for ongoing employment (no end_date)
  const startDate = new Date().toISOString();
  const contractBody = {
    start_date: startDate,
    end_date: null, // Ongoing contract - no end date
    pay_rate: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
    pay_period: RandomGenerator.pick([
      "hourly",
      "daily",
      "weekly",
      "monthly",
    ] as const),
    working_hours_per_week: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<20> & tags.Maximum<60>
    >(),
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHrmPlatformEmployeeContract.ICreate;
  // 3. Generate random employee ID for testing
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create the ongoing contract using utility function
  const contract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        body: contractBody,
        params: { employeeId },
      },
    );
  typia.assert(contract);
  // 5. Validate the contract was created with ongoing status
  TestValidator.equals(
    "end_date is null for ongoing contract",
    contract.end_date,
    null,
  );
  TestValidator.equals(
    "contract is active (not deleted)",
    contract.deleted_at,
    null,
  );
  TestValidator.equals(
    "start_date matches input",
    contract.start_date,
    startDate,
  );
  TestValidator.equals(
    "pay_rate matches input",
    contract.pay_rate,
    contractBody.pay_rate,
  );
  TestValidator.equals(
    "pay_period matches input",
    contract.pay_period,
    contractBody.pay_period,
  );
  TestValidator.equals(
    "working_hours_per_week matches input",
    contract.working_hours_per_week,
    contractBody.working_hours_per_week,
  );
  TestValidator.equals("notes match input", contract.notes, contractBody.notes);
  // 6. Validate employee relation exists
  TestValidator.predicate(
    "employee relation exists",
    contract.employee !== undefined,
  );
  TestValidator.predicate(
    "employee has valid id",
    contract.employee.id.length > 0,
  );
  TestValidator.predicate(
    "employee has user info",
    contract.employee.user !== undefined,
  );
  TestValidator.predicate(
    "employee has role info",
    contract.employee.role !== undefined,
  );
  // 7. Validate timestamps exist
  TestValidator.predicate("created_at exists", contract.created_at.length > 0);
  TestValidator.predicate("updated_at exists", contract.updated_at.length > 0);
}
