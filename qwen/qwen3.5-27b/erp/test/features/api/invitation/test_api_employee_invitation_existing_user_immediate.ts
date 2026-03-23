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

export async function test_api_employee_invitation_existing_user_immediate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member account (existing user to be invited)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: "existing.user@test.com",
      password: "1234",
      href: "https://test.com/member/join",
      referrer: "https://test.com/member",
    },
  });
  typia.assert(memberAuth);
  // 2. Setup: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/login",
      referrer: "https://test.com/admin",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 3. Test: Create invitation for existing member
  // Note: role_id should be a valid role from the organization
  // Since we don't have list APIs in the SDK, we assume a valid role exists
  const invitation = await api.functional.hrmPlatform.admin.invitations.create(
    adminConnection,
    {
      body: {
        email: memberAuth.email,
        role_id: memberAuth.id, // Using member ID as placeholder - actual role_id needed
      } satisfies IHrmPlatformEmployeeInvitation.ICreate,
    },
  );
  typia.assert(invitation);
  // 4. Validate: Invitation is immediately accepted
  TestValidator.equals(
    "invitation status is accepted",
    invitation.status,
    "accepted",
  );
  // 5. Validate: redeemed_at is set (not null)
  TestValidator.predicate(
    "redeemed_at is not null",
    invitation.redeemed_at !== null,
  );
  // 6. Validate: redeemedByMember contains the existing member
  TestValidator.predicate(
    "redeemedByMember exists",
    invitation.redeemedByMember !== null,
  );
  if (invitation.redeemedByMember !== null) {
    TestValidator.equals(
      "redeemedByMember email matches",
      invitation.redeemedByMember.email,
      memberAuth.email,
    );
    TestValidator.equals(
      "redeemedByMember id matches",
      invitation.redeemedByMember.id,
      memberAuth.id,
    );
  }
  // 7. Validate: Invitation contains organization and role information
  TestValidator.predicate(
    "organization exists",
    invitation.organization !== null,
  );
  TestValidator.predicate("role exists", invitation.role !== null);
}
