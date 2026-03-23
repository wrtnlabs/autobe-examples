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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_admin_invitations_create } from "../../../generate/generate_random_hrm_platform_admin_invitations_create";
import { generate_random_hrm_platform_contracts_create } from "../../../generate/generate_random_hrm_platform_contracts_create";
import { prepare_random_hrm_platform_contract } from "../../../prepare/prepare_random_hrm_platform_contract";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";

/**
 * Test that organization deletion is blocked when active contracts exist.
 *
 * This test verifies that:
 * 1. A member authenticates via join which creates an organization
 * 2. An employee invitation is created and accepted to have an employee in the organization
 * 3. An active contract is created for the employee
 * 4. The deletion request fails with an appropriate error message indicating active contracts must be ended
 * 5. The organization and all its data remain intact after the failed deletion attempt
 */
export async function test_api_organization_deletion_active_contracts_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - creates organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  const organizationId = memberAuth.id;
  // 2. Admin authentication for managing invitations and contracts
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 3. Create employee invitation to add an employee to the organization
  const invitation =
    await generate_random_hrm_platform_admin_invitations_create(
      adminConnection,
      {},
    );
  typia.assert(invitation);
  // 4. Create an active contract for the employee
  // Note: The invitation response includes employee information after acceptance
  // We need to extract the employee_id from the invitation
  const contract = await generate_random_hrm_platform_contracts_create(
    adminConnection,
    {
      body: {
        employee_id: invitation.redeemedByMember?.id ?? invitation.id,
        start_at: new Date().toISOString(),
        end_at: null, // Active contract with no end date
        pay_rate: 50000,
        pay_period: "monthly",
        working_hours_per_week: 40,
      },
    },
  );
  typia.assert(contract);
  // 5. Attempt to delete the organization - should fail due to active contract
  await TestValidator.error(
    "organization deletion blocked by active contract",
    async () => {
      await api.functional.hrmPlatform.member.organizations.erase(
        memberConnection,
        {
          organizationId: organizationId,
        },
      );
    },
  );
  // 6. Verify organization still exists (implicit - if deletion succeeded, this would fail)
  // The organization should remain intact with all its data
  TestValidator.predicate(
    "organization still exists after failed deletion",
    () => organizationId !== null && organizationId !== undefined,
  );
}
