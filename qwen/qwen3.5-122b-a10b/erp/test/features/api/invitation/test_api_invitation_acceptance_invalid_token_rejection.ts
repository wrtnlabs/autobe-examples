import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that accepting an invitation with an invalid token is rejected.
 *
 * Validates the token verification security check when accepting employee invitations. The test ensures that providing an incorrect token value results in HTTP 401 Unauthorized, preventing unauthorized invitation acceptance.
 *
 * 1. Create a member account with a random email address.
 * 2. Generate a random invitation ID (UUID).
 * 3. Call the accept endpoint with the invitation ID but provide an incorrect token value.
 * 4. Verify the response returns HTTP 401 Unauthorized indicating token mismatch.
 */
export async function test_api_invitation_acceptance_invalid_token_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with random email
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  // 2. Generate random invitation ID
  const invitationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call accept with wrong token
  await TestValidator.httpError("invalid token rejected", 401, async () => {
    await api.functional.hrm.member.invitations.accept(memberConnection, {
      invitationId,
      body: {
        token: typia.random<string>(), // Wrong token - won't match any invitation
      } satisfies IHrmEmployeeInvitation.IAccept,
    });
  });
}
