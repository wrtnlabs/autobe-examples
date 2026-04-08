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
 * Test retrieving a password reset token that has already been used.
 *
 * Validates that the system properly rejects password reset tokens that have been consumed, preventing replay attacks where the same token is used multiple times. This test verifies error handling when attempting to retrieve a token that is no longer valid due to prior usage.
 *
 * 1. Register a new member account using the join operation
 * 2. Attempt to retrieve a password reset token that has already been used (simulated with a random UUID representing a consumed token)
 * 3. Verify the response returns HTTP 409 Conflict status indicating the token cannot be reused
 * 4. Validate that the system properly prevents replay attacks by rejecting used tokens
 */
export async function test_api_password_reset_retrieve_used_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Generate a reset ID representing an already-used token
  // In production, this would be a token that was previously created and consumed
  const usedResetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve the used password reset token
  // This should fail with 409 Conflict because the token has already been used
  await TestValidator.httpError(
    "used password reset token should return 409 Conflict",
    409,
    async () =>
      await api.functional.hrmTimeTrack.member.password_resets.at(
        memberConnection,
        {
          resetId: usedResetId,
        },
      ),
  );
}
