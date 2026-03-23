import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
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
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";

/**
 * Test employee invitation for new user who doesn't have an existing account.
 *
 * This test verifies the complete flow of inviting a new employee to the
 * organization when the invited email address does not have a registered
 * user account. The test validates that a pending invitation is created
 * with proper expiration, token generation, and null redemption fields.
 */
export async function test_api_employee_invitation_new_user_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Generate unique email for new user invitation
  const inviteEmail: string = typia.random<string & tags.Format<"email">>();
  // 3. Generate a valid role_id (assuming test environment has at least one role)
  const roleId: string = typia.random<string & tags.Format<"uuid">>();
  // 4. Create invitation using utility function
  const invitation: IHrmPlatformEmployeeInvitation =
    await generate_random_hrm_platform_admin_invitations_create(
      adminConnection,
      {
        body: {
          email: inviteEmail,
          role_id: roleId,
        } satisfies IHrmPlatformEmployeeInvitation.ICreate,
      },
    );
  // 5. Validate response structure
  typia.assert(invitation);
  // 6. Verify invitation email matches the invited email
  TestValidator.equals(
    "invitation email matches",
    invitation.email,
    inviteEmail,
  );
  // 7. Verify invitation status is pending
  TestValidator.equals("status is pending", invitation.status, "pending");
  // 8. Verify token is present and non-empty
  TestValidator.predicate("token is non-empty", invitation.token.length > 0);
  // 9. Verify expires_at is 7 days from created_at
  const createdAt: Date = new Date(invitation.created_at);
  const expiresAt: Date = new Date(invitation.expires_at);
  const expectedExpiry: Date = new Date(
    createdAt.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  TestValidator.predicate(
    "expires_at is 7 days from created_at",
    Math.abs(expiresAt.getTime() - expectedExpiry.getTime()) < 60000,
  );
  // 10. Verify redeemed_at is null (not yet redeemed)
  TestValidator.equals("redeemed_at is null", invitation.redeemed_at, null);
  // 11. Verify redeemedByMember is null (new user, no account exists)
  TestValidator.equals(
    "redeemedByMember is null",
    invitation.redeemedByMember,
    null,
  );
  // 12. Verify organization is present
  typia.assert(invitation.organization);
  TestValidator.predicate(
    "organization exists",
    invitation.organization.id.length > 0,
  );
  // 13. Verify role is present
  typia.assert(invitation.role);
  TestValidator.equals("role_id matches", invitation.role.id, roleId);
}
