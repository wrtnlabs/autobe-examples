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

export async function test_api_contract_creation_with_end_date(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test creating a temporary employment contract with an explicit end date.
   *
   * This test verifies:
   * 1. Admin authentication and employee creation
   * 2. Contract creation with explicit end_at date
   * 3. Validation of contract terms and date constraints
   * 4. Proper storage of all contract fields
   */
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create employee via invitation
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
  // Use the member ID from redeemed invitation as employee reference
  // In a real scenario, the invitation would be redeemed and create an employee record
  const employeeId: string & tags.Format<"uuid"> =
    invitation.redeemedByMember?.id ??
    typia.random<string & tags.Format<"uuid">>();
  // 3. Create contract with explicit end date
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 6); // 6 months from start
  const contract = await generate_random_hrm_platform_contracts_create(
    adminConnection,
    {
      body: {
        employee_id: employeeId,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
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
          number & tags.Type<"uint32"> & tags.Minimum<20> & tags.Maximum<60>
        >(),
      },
    },
  );
  typia.assert(contract);
  // Narrow nullable end_at type
  typia.assertGuard(contract.end_at!);
  // 4. Validate contract end_at matches provided value
  TestValidator.equals(
    "contract end_at matches provided date",
    contract.end_at,
    endDate.toISOString(),
  );
  // 5. Validate end_at >= start_at (business logic validation)
  TestValidator.predicate(
    "end_at is after start_at",
    new Date(contract.end_at).getTime() >=
      new Date(contract.start_at).getTime(),
  );
  // 6. Validate employee_id matches (business logic validation)
  TestValidator.equals(
    "contract employee_id matches",
    contract.employee.id,
    employeeId,
  );
  // 7. Validate contract is active (deleted_at is null)
  TestValidator.equals("contract is active", contract.deleted_at, null);
}
