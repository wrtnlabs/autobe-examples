import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that revoking a non-existent invitation returns 404 Not Found.
 *
 * Validates that the invitation revocation endpoint properly handles requests for invitations that do not exist in the current organization. Ensures that the system returns a 404 error rather than a 500 or other unexpected response, confirming that the organization scope is enforced and that non-existent resources cannot be accidentally modified.
 *
 * 1. Authenticate as a member by joining with random credentials.
 * 2. Generate a random UUID that does not correspond to any existing invitation.
 * 3. Attempt to revoke the non-existent invitation.
 * 4. Verify the system returns a 404 Not Found error.
 */
export async function test_api_invitation_revoke_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a random UUID for a non-existent invitation
  const nonExistentInvitationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to revoke the non-existent invitation - expect 404
  await TestValidator.httpError(
    "revoke non-existent invitation returns 404",
    404,
    async () => {
      await api.functional.erpHrm.member.invitations.erase(memberConnection, {
        invitationId: nonExistentInvitationId,
      });
    },
  );
}
