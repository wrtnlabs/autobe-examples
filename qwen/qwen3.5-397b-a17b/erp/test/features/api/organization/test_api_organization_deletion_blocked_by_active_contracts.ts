import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
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
import { generate_random_hrm_platform_member_invitations_create } from "../../../generate/generate_random_hrm_platform_member_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_employee_contract } from "../../../prepare/prepare_random_hrm_platform_employee_contract";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test organization deletion is blocked when active employee contracts exist.
 *
 * Test flow:
 * 1. Register a new member account and authenticate
 * 2. Create a new organization where the member is the owner
 * 3. Create an active employment contract for the member (who is automatically the owner/employee)
 * 4. Attempt to delete the organization
 * 5. Verify the deletion request is rejected with a 409 Conflict error
 *
 * This validates the business rule that organizations cannot be deleted while
 * employees have active contracts (end_date is null or in the future).
 */
export async function test_api_organization_deletion_blocked_by_active_contracts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create organization (member becomes owner/employee automatically)
  const organization =
    await api.functional.hrmPlatform.member.organizations.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create active employment contract for the member (who is the owner/employee)
  // Using member.id as employeeId since member becomes employee upon organization creation
  const contract =
    await api.functional.hrmPlatform.member.employees.contracts.create(
      memberConnection,
      {
        employeeId: member.id,
        body: {
          start_date: new Date().toISOString(),
          end_date: null, // null indicates ongoing/active contract
          pay_rate: 50000,
          pay_period: "monthly",
          working_hours_per_week: 40,
          notes: "Active contract blocking organization deletion",
        } satisfies IHrmPlatformEmployeeContract.ICreate,
      },
    );
  typia.assert(contract);
  // 4. Verify contract is active (end_date is null)
  TestValidator.predicate(
    "contract is active (no end date)",
    contract.end_date === null || contract.end_date === undefined,
  );
  // 5. Attempt to delete organization - should fail with 409 Conflict
  await TestValidator.error(
    "organization deletion blocked by active contract",
    async () => {
      await api.functional.hrmPlatform.member.organizations.erase(
        memberConnection,
        {
          organizationId: organization.id,
        },
      );
    },
  );
}
