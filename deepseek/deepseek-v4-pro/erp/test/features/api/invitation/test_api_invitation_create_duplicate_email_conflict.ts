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
 * Test duplicate invitation conflict enforcement for pending invitations.
 *
 * Validates the business rule that only one pending invitation per email address
 * can exist within an organization at any time. The test creates an initial
 * invitation for a specific email, confirms it is in pending status, then
 * attempts to create a second invitation with the identical email address. This
 * second attempt must be rejected, proving the duplicate detection logic works
 * correctly.
 *
 * 1. Member joins and authenticates, gaining Owner-level employee:manage permission
 *    within the newly created organization.
 * 2. First invitation is created with a fixed email and verified to be in pending
 *    status with the correct email address.
 * 3. Second invitation with the same email is attempted and must fail, confirming
 *    that duplicate pending invitations are prevented.
 */
export async function test_api_invitation_create_duplicate_email_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member with Owner permissions
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create first invitation — must succeed
  const duplicateEmail = "duplicate@example.com";
  const firstInvitation =
    await generate_random_erp_hrm_member_invitations_create(memberConnection, {
      body: { email: duplicateEmail },
    });
  typia.assert(firstInvitation);
  TestValidator.equals("pending status", firstInvitation.status, "pending");
  TestValidator.equals(
    "email matches input",
    firstInvitation.email,
    duplicateEmail,
  );
  // 3. Attempt duplicate invitation — must be rejected
  await TestValidator.error("duplicate invitation email conflict", async () => {
    await generate_random_erp_hrm_member_invitations_create(memberConnection, {
      body: { email: duplicateEmail },
    });
  });
}
