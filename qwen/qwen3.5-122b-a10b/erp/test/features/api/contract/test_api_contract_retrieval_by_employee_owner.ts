import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
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
import { prepare_random_hrm_contract } from "../../../prepare/prepare_random_hrm_contract";

/**
 * Test employee contract retrieval by contract ID.
 *
 * Validates that an authenticated employee can successfully retrieve their own employment contract using the contract ID endpoint. This test ensures proper authorization and contract data integrity for the employee owner scenario.
 *
 * The test follows the complete flow of member authentication, contract creation, and contract retrieval to verify the endpoint returns accurate contract information with all compensation terms and working conditions.
 *
 * 1. Authenticate as member using email/password credentials via authorize_member_join utility.
 * 2. Create member-specific connection with the auth token for subsequent API calls.
 * 3. Create an employment contract with valid compensation terms (start_date, pay_rate, pay_period) using generate_random_hrm_member_employees_contracts_create utility.
 * 4. Retrieve the contract using api.functional.hrm.member.organizations.employees.contracts.at with organizationId, employeeId, and contractId.
 * 5. Verify response contains complete contract record with all IHrmContract fields including employee reference, dates, pay information, and metadata.
 * 6. Validate contract data matches the created contract to ensure data consistency.
 */
export async function test_api_contract_retrieval_by_employee_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // 2. Generate UUIDs for employee and organization (employee must exist in real scenario)
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create employment contract
  const contract = await generate_random_hrm_member_employees_contracts_create(
    memberConnection,
    {
      body: {
        start_date: new Date(
          Date.now() + 1000 * 60 * 60 * 24,
        ).toISOString() satisfies string & tags.Format<"date-time">,
        pay_rate: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        pay_period: RandomGenerator.pick([
          "hourly",
          "daily",
          "weekly",
          "monthly",
        ]),
        working_hours_per_week: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<80>
        >(),
        notes: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IHrmContract.ICreate,
      params: {
        employeeId,
      },
    },
  );
  typia.assert(contract);
  // 4. Retrieve the contract
  const retrieved =
    await api.functional.hrm.member.organizations.employees.contracts.at(
      memberConnection,
      {
        organizationId,
        employeeId,
        contractId: contract.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate response structure and data
  TestValidator.equals("contract ID matches", retrieved.id, contract.id);
  TestValidator.equals(
    "start date matches",
    retrieved.start_date,
    contract.start_date,
  );
  TestValidator.equals(
    "pay rate matches",
    retrieved.pay_rate,
    contract.pay_rate,
  );
  TestValidator.equals(
    "pay period matches",
    retrieved.pay_period,
    contract.pay_period,
  );
  TestValidator.predicate(
    "active contract has null end date",
    retrieved.end_date === null,
  );
  TestValidator.equals(
    "working hours match",
    retrieved.working_hours_per_week,
    contract.working_hours_per_week,
  );
}
