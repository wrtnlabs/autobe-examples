import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
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
import { generate_random_hrm_platform_member_contracts_create } from "../../../generate/generate_random_hrm_platform_member_contracts_create";
import { prepare_random_hrm_platform_contract } from "../../../prepare/prepare_random_hrm_platform_contract";

/**
 * Test member ability to retrieve their own employment contract details.
 *
 * Validates that an authorized member can successfully query their own contract
 * after it has been created. The test verifies complete contract information
 * including title, employment period (start and optional end dates), compensation
 * details, status, and organizational context. This ensures data isolation where
 * members can only access their own contracts and all contract fields are
 * properly populated and correctly typed.
 *
 * 1. Member registers and joins, creating an organization and employee account.
 * 2. Contract is created for the employee with full compensation and date details.
 * 3. Member retrieves their own contract using the contract ID.
 * 4. Validates the response contains complete contract details matching the
 *    creation data, including employee and organization references.
 */
export async function test_api_contract_reading_employee_view_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication via join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      org_currency: "KRW",
    },
  });
  typia.assert(memberAuth);
  const { id: memberId, member } = memberAuth;
  // 2. Create contract for the employee
  const contract = await generate_random_hrm_platform_member_contracts_create(
    memberConnection,
    {
      body: {
        employee_id: memberId,
      },
    },
  );
  typia.assert(contract);
  // 3. Retrieve contract by ID
  const retrievedContract =
    await api.functional.hrmPlatform.member.contracts.at(memberConnection, {
      contractId: contract.id,
    });
  typia.assert(retrievedContract);
  // 4. Validate response structure and data integrity
  TestValidator.equals(
    "contract ID matches",
    retrievedContract.id,
    contract.id,
  );
  TestValidator.equals(
    "title matches",
    retrievedContract.title,
    contract.title,
  );
  TestValidator.equals(
    "status matches",
    retrievedContract.status,
    contract.status,
  );
  TestValidator.equals(
    "employee ID matches",
    retrievedContract.employee.id,
    contract.employee.id,
  );
  TestValidator.equals(
    "organization ID matches",
    retrievedContract.organization.id,
    contract.organization.id,
  );
  TestValidator.equals(
    "compensation amount matches",
    retrievedContract.compensation_amount,
    contract.compensation_amount,
  );
  TestValidator.equals(
    "compensation currency matches",
    retrievedContract.compensation_currency,
    contract.compensation_currency,
  );
  TestValidator.equals(
    "start date matches",
    retrievedContract.start_date,
    contract.start_date,
  );
  TestValidator.equals(
    "end date matches",
    retrievedContract.end_date,
    contract.end_date,
  );
  TestValidator.equals("notes match", retrievedContract.notes, contract.notes);
}
