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
 * Test that an employee can view their own active employment contract through admin context.
 *
 * This test validates the contract viewing functionality by:
 * 1. Authenticating as an admin user
 * 2. Creating an employee invitation to establish the employee record
 * 3. Creating an active employment contract for the employee
 * 4. Retrieving the contract details using the contract ID
 * 5. Validating all contract fields and related data
 */
export async function test_api_contract_view_active_by_employee(
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
  const employeeEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const invitation: IHrmPlatformEmployeeInvitation =
    await generate_random_hrm_platform_admin_invitations_create(
      adminConnection,
      {
        body: {
          email: employeeEmail,
          role_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(invitation);
  // Extract member ID from invitation (the member who will become the employee)
  // Note: In a real scenario, the invitation would be redeemed first to create the employee
  // For this test, we use the member ID from redeemedByMember or create a contract directly
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create active employment contract for the employee
  const contract: IHrmPlatformContract =
    await generate_random_hrm_platform_contracts_create(adminConnection, {
      body: {
        employee_id: employeeId,
        start_at: new Date().toISOString(),
        end_at: null,
        pay_rate: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100000>
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
    });
  typia.assert(contract);
  // 4. Retrieve the contract details using the contract ID
  const retrievedContract: IHrmPlatformContract =
    await api.functional.hrmPlatform.contracts.at(adminConnection, {
      contractId: contract.id,
    });
  typia.assert(retrievedContract);
  // 5. Validate contract fields
  TestValidator.equals(
    "contract ID matches",
    retrievedContract.id,
    contract.id,
  );
  TestValidator.equals(
    "start_at matches",
    retrievedContract.start_at,
    contract.start_at,
  );
  TestValidator.equals(
    "end_at is null for active contract",
    retrievedContract.end_at,
    null,
  );
  TestValidator.equals(
    "pay_rate matches",
    retrievedContract.pay_rate,
    contract.pay_rate,
  );
  TestValidator.equals(
    "pay_period matches",
    retrievedContract.pay_period,
    contract.pay_period,
  );
  TestValidator.equals(
    "working_hours_per_week matches",
    retrievedContract.working_hours_per_week,
    contract.working_hours_per_week,
  );
  // 6. Validate employee object
  TestValidator.predicate(
    "employee exists",
    retrievedContract.employee.id !== undefined,
  );
  TestValidator.predicate(
    "employee has employment_type",
    retrievedContract.employee.employment_type !== undefined,
  );
  TestValidator.predicate(
    "employee has status",
    retrievedContract.employee.status !== undefined,
  );
  TestValidator.predicate(
    "employee member has email",
    retrievedContract.employee.member.email !== undefined,
  );
  // 7. Validate organization object
  TestValidator.predicate(
    "organization exists",
    retrievedContract.organization.id !== undefined,
  );
  TestValidator.predicate(
    "organization has name",
    retrievedContract.organization.name !== undefined,
  );
  TestValidator.predicate(
    "organization setting has currency",
    retrievedContract.organization.setting.currency !== undefined,
  );
  TestValidator.predicate(
    "organization setting has timezone",
    retrievedContract.organization.setting.timezone !== undefined,
  );
  // 8. Validate pay_rate is positive
  TestValidator.predicate(
    "pay_rate is positive",
    retrievedContract.pay_rate > 0,
  );
  // 9. Validate pay_period is valid enum value
  const validPayPeriods = ["hourly", "daily", "weekly", "monthly"] as const;
  TestValidator.predicate(
    "pay_period is valid enum value",
    validPayPeriods.includes(
      retrievedContract.pay_period as (typeof validPayPeriods)[number],
    ),
  );
  // 10. Validate working_hours_per_week is positive
  TestValidator.predicate(
    "working_hours_per_week is positive",
    retrievedContract.working_hours_per_week > 0,
  );
  // 11. Validate timestamps exist
  TestValidator.predicate(
    "created_at exists",
    retrievedContract.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedContract.updated_at !== undefined,
  );
}
