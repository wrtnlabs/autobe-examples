import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_invitations_create } from "../../../generate/generate_random_hrm_platform_admin_invitations_create";
import { generate_random_hrm_platform_contracts_create } from "../../../generate/generate_random_hrm_platform_contracts_create";
import { prepare_random_hrm_platform_contract } from "../../../prepare/prepare_random_hrm_platform_contract";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";

/**
 * Test that historical contracts (with end dates) are viewable and remain as immutable records.
 *
 * This test verifies:
 * 1. Creating a first contract with a past start date
 * 2. Creating a second contract which auto-ends the first contract
 * 3. Retrieving the historical contract and verifying its immutability
 * 4. Confirming all original terms are preserved in the historical record
 */
export async function test_api_contract_view_historical_immutable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create employee invitation to establish employee record
  const invitation =
    await generate_random_hrm_platform_admin_invitations_create(
      adminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          role_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(invitation);
  // Extract employee_id from the invitation
  // The invitation should have redeemedByMember if the email already exists
  const employeeId: string & tags.Format<"uuid"> =
    invitation.redeemedByMember?.id ??
    (typia.random<string & tags.Format<"uuid">>() as string &
      tags.Format<"uuid">);
  // 3. Create first contract with start date in the past (2024-01-01) and no end date
  const firstContract = await generate_random_hrm_platform_contracts_create(
    adminConnection,
    {
      body: {
        employee_id: employeeId,
        start_at: "2024-01-01T00:00:00.000Z",
        end_at: null,
        pay_rate: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<10000>
        >(),
        pay_period: "monthly",
        working_hours_per_week: 40,
      },
    },
  );
  typia.assert(firstContract);
  // Store original terms for validation
  const originalPayRate = firstContract.pay_rate;
  const originalPayPeriod = firstContract.pay_period;
  const originalWorkingHours = firstContract.working_hours_per_week;
  const firstContractId = firstContract.id;
  // 4. Create second contract with start date after first contract (2024-06-01)
  // This should automatically end the first contract on 2024-05-31
  const secondContract = await generate_random_hrm_platform_contracts_create(
    adminConnection,
    {
      body: {
        employee_id: employeeId,
        start_at: "2024-06-01T00:00:00.000Z",
        end_at: null,
        pay_rate: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<10000>
        >(),
        pay_period: "monthly",
        working_hours_per_week: 40,
      },
    },
  );
  typia.assert(secondContract);
  // 5. Retrieve the historical contract (first contract)
  const historicalContract = await api.functional.hrmPlatform.contracts.at(
    adminConnection,
    {
      contractId: firstContractId,
    },
  );
  typia.assert(historicalContract);
  // 6. Verify the historical contract has end_at set (not null)
  TestValidator.predicate(
    "historical contract has end date",
    historicalContract.end_at !== null,
  );
  // 7. Verify end_at is set to a date in the past (before second contract start)
  if (historicalContract.end_at) {
    const endDate = new Date(historicalContract.end_at);
    const secondContractStart = new Date("2024-06-01T00:00:00.000Z");
    TestValidator.predicate(
      "end date is before second contract start",
      endDate < secondContractStart,
    );
  }
  // 8. Verify all original terms are preserved (immutability check)
  TestValidator.equals(
    "original pay rate preserved",
    historicalContract.pay_rate,
    originalPayRate,
  );
  TestValidator.equals(
    "original pay period preserved",
    historicalContract.pay_period,
    originalPayPeriod,
  );
  TestValidator.equals(
    "original working hours preserved",
    historicalContract.working_hours_per_week,
    originalWorkingHours,
  );
  // 9. Verify contract is still accessible (not deleted)
  TestValidator.predicate(
    "historical contract is accessible",
    historicalContract.deleted_at === null,
  );
  // 10. Verify contract belongs to correct employee
  TestValidator.equals(
    "contract belongs to correct employee",
    historicalContract.employee.id,
    employeeId,
  );
  // 11. Verify start_at is unchanged
  TestValidator.equals(
    "start date unchanged",
    historicalContract.start_at,
    firstContract.start_at,
  );
}
