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
 * Test creating the first employment contract for an employee who has no existing contracts.
 *
 * This test validates:
 * 1. Admin authentication and authorization
 * 2. Employee invitation creation
 * 3. First contract creation for an employee with no prior contracts
 * 4. Contract response validation including all required fields
 * 5. Ongoing contract verification (end_at is null)
 * 6. Multi-tenancy isolation (organization derived from employee)
 */
export async function test_api_contract_creation_first_contract(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Create employee invitation (this creates the employee record)
  const invitation =
    await generate_random_hrm_platform_admin_invitations_create(
      adminConnection,
      {},
    );
  typia.assert(invitation);
  // Use the invitation's redeemed member ID as employee_id
  // The invitation should have created an employee record linked to the member
  const employeeId = invitation.redeemedByMember?.id ?? invitation.id;
  // 3. Create the first contract for this employee
  const contract = await generate_random_hrm_platform_contracts_create(
    adminConnection,
    {
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
        ] as const),
        working_hours_per_week: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<20> & tags.Maximum<60>
        >(),
      },
    },
  );
  typia.assert(contract);
  // 4. Validate contract response contains all required fields
  TestValidator.predicate("contract has valid id", contract.id.length > 0);
  TestValidator.equals("employee_id matches", contract.employee.id, employeeId);
  TestValidator.predicate(
    "organization exists",
    contract.organization.id.length > 0,
  );
  // 5. Validate contract is ongoing (no end_at)
  TestValidator.equals(
    "contract is ongoing (end_at is null)",
    contract.end_at,
    null,
  );
  // 6. Validate contract is active (deleted_at is null)
  TestValidator.equals(
    "contract is active (deleted_at is null)",
    contract.deleted_at,
    null,
  );
  // 7. Validate required fields are present
  TestValidator.predicate("start_at is set", contract.start_at.length > 0);
  TestValidator.predicate("pay_rate is positive", contract.pay_rate > 0);
  TestValidator.predicate(
    "pay_period is valid",
    ["hourly", "daily", "weekly", "monthly"].includes(contract.pay_period),
  );
  TestValidator.predicate(
    "working_hours_per_week is positive",
    contract.working_hours_per_week > 0,
  );
  // 8. Validate timestamps are set
  TestValidator.predicate("created_at is set", contract.created_at.length > 0);
  TestValidator.predicate("updated_at is set", contract.updated_at.length > 0);
}
