import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_invitations_create } from "../../../generate/generate_random_erp_hrm_member_invitations_create";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";

/**
 * Test creation of a pending employee invitation.
 *
 * Validates the invitation creation flow where an authenticated organization Owner sends an employee invitation via email. The invitation is created in pending status and remains unresolved until the recipient signs up with the matching email address.
 *
 * Special attention is given to verifying that the created invitation has the correct pending status with null resolved_at, and that the full IErpHrmInvitation structure including the nested role summary is validated through typia.assert.
 *
 * 1. Authenticate as a member via join, which creates a new organization where the member is the Owner with employee:manage permission.
 * 2. Create an employee invitation with a specific email address targeting a valid role in the organization.
 * 3. Validate the invitation response: email matches request, status is pending, and resolved_at is null.
 */
export async function test_api_invitation_create_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create invitation with specific email
  const inviteEmail = "newemployee@example.com";
  const invitation = await generate_random_erp_hrm_member_invitations_create(
    memberConnection,
    { body: { email: inviteEmail } },
  );
  typia.assert(invitation);
  // 3. Validate invitation business logic
  TestValidator.equals("email matches request", invitation.email, inviteEmail);
  TestValidator.equals("status is pending", invitation.status, "pending");
  TestValidator.equals("resolved_at is null", invitation.resolved_at, null);
}
