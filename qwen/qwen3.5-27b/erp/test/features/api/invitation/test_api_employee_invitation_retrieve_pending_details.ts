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
 * Test that an authenticated admin can retrieve detailed information about a pending employee invitation.
 *
 * This test validates the complete flow of creating and retrieving employee invitation details:
 * 1. Authenticate as admin
 * 2. Create a pending employee invitation
 * 3. Retrieve the invitation details by ID
 * 4. Verify all expected fields are present and correct
 */
export async function test_api_employee_invitation_retrieve_pending_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a pending employee invitation
  const invitation: IHrmPlatformEmployeeInvitation =
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
  // 3. Retrieve the invitation details by ID
  const retrieved: IHrmPlatformEmployeeInvitation =
    await api.functional.hrmPlatform.admin.invitations.at(adminConnection, {
      invitationId: invitation.id,
    });
  typia.assert(retrieved);
  // 4. Verify all expected fields are present and correct
  TestValidator.equals("invitation id matches", retrieved.id, invitation.id);
  TestValidator.equals("email matches", retrieved.email, invitation.email);
  TestValidator.equals("token matches", retrieved.token, invitation.token);
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals(
    "expires_at matches",
    retrieved.expires_at,
    invitation.expires_at,
  );
  TestValidator.equals(
    "created_at matches",
    retrieved.created_at,
    invitation.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrieved.updated_at,
    invitation.updated_at,
  );
  TestValidator.equals(
    "redeemed_at is null for pending",
    retrieved.redeemed_at,
    null,
  );
  TestValidator.equals(
    "redeemedByMember is null for pending",
    retrieved.redeemedByMember,
    null,
  );
  // 5. Verify organization details are present
  TestValidator.predicate(
    "organization exists",
    retrieved.organization !== null,
  );
  TestValidator.predicate(
    "organization has id",
    retrieved.organization.id !== undefined,
  );
  TestValidator.predicate(
    "organization has name",
    retrieved.organization.name !== undefined,
  );
  TestValidator.predicate(
    "organization has settings",
    retrieved.organization.setting !== undefined,
  );
  TestValidator.predicate(
    "organization has logo",
    retrieved.organization.logo !== undefined,
  );
  // 6. Verify role details are present
  TestValidator.predicate("role exists", retrieved.role !== null);
  TestValidator.equals(
    "role id matches",
    retrieved.role.id,
    invitation.role.id,
  );
  TestValidator.predicate("role has name", retrieved.role.name !== undefined);
  TestValidator.predicate(
    "role has is_builtin flag",
    retrieved.role.is_builtin !== undefined,
  );
}
