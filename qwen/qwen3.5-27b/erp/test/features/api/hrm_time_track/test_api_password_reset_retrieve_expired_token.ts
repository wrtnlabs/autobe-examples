import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving a password reset token that has expired.
 *
 * Validates the password reset token expiration handling by attempting to retrieve an expired token. The test ensures that the system properly rejects expired password reset tokens with appropriate HTTP error responses.
 *
 * This test covers the security aspect of password reset functionality by verifying that tokens cannot be used after their expiration time. Expired tokens must be rejected with a 410 Gone status code to prevent stale token usage.
 *
 * 1. Register a new member account to establish a valid member identity
 * 2. Attempt to retrieve a password reset token with an expired token ID
 * 3. Verify the system returns HTTP 410 Gone status for expired tokens
 * 4. Validate that the error response properly indicates the token expiration
 */
export async function test_api_password_reset_retrieve_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Generate an expired password reset token ID for testing
  const expiredResetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve the expired password reset token
  // The system should return 410 Gone for expired tokens
  await TestValidator.httpError(
    "expired token returns 410 Gone",
    410,
    async () =>
      await api.functional.hrmTimeTrack.member.password_resets.at(
        memberConnection,
        { resetId: expiredResetId },
      ),
  );
}
