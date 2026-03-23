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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_admin_invitations_create } from "../../../generate/generate_random_hrm_platform_admin_invitations_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";

/**
 * Test that duplicate employee invitation is rejected with 409 Conflict.
 *
 * This test verifies that when attempting to invite an email address that
 * already belongs to an existing employee in the organization, the system
 * correctly rejects the invitation with HTTP 409 Conflict status.
 */
export async function test_api_employee_invitation_duplicate_employee_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://test.com/admin/login",
      referrer: "https://test.com",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Setup: Create member user account
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: "password123",
      href: "https://test.com/member/join",
      referrer: "https://test.com",
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 3. Setup: Create first invitation for member (member becomes employee)
  const roleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const firstInvitation =
    await api.functional.hrmPlatform.admin.invitations.create(adminConnection, {
      body: {
        email: memberEmail,
        role_id: roleId,
      } satisfies IHrmPlatformEmployeeInvitation.ICreate,
    });
  typia.assert(firstInvitation);
  // 4. Test: Attempt to create duplicate invitation with same email
  // Should fail with HTTP 409 Conflict because email already belongs to employee
  await TestValidator.httpError(
    "duplicate employee invitation returns 409 Conflict",
    409,
    async () => {
      await api.functional.hrmPlatform.admin.invitations.create(
        adminConnection,
        {
          body: {
            email: memberEmail,
            role_id: roleId,
          } satisfies IHrmPlatformEmployeeInvitation.ICreate,
        },
      );
    },
  );
  // 5. Validation: Verify original invitation still exists and unchanged
  TestValidator.equals(
    "original invitation email unchanged",
    firstInvitation.email,
    memberEmail,
  );
  TestValidator.equals(
    "original invitation role unchanged",
    firstInvitation.role.id,
    roleId,
  );
  TestValidator.predicate(
    "original invitation status is pending",
    firstInvitation.status === "pending",
  );
}
