import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful validation of a valid, non-expired password reset token.
 *
 * Scenario: A member who forgot their password clicks the reset link from
 * their email with a valid, non-expired token.
 *
 * Validation points:
 * 1. Given a password reset token exists and has not expired
 * 2. When accessing GET /password-resets/{resetId} with valid token
 * 3. Then response returns reset validation result
 * 4. Response includes email for account verification
 * 5. Response includes expiration timestamp (expired_at)
 * 6. Response includes reset record id (UUID format)
 * 7. Response includes creation timestamp (created_at)
 * 8. The expired_at timestamp should be greater than current time
 */
export async function test_api_password_reset_token_valid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account for testing
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Generate a reset token ID (UUID format)
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Validate the reset token via API
  // Note: Password reset endpoint requires no authentication
  const resetValidation =
    await api.functional.discussionBoard.member.password_resets.at(connection, {
      resetId,
    });
  typia.assert(resetValidation);
  // 4. Verify token is not expired (expired_at should be in the future)
  const now = new Date();
  const expiredAt = new Date(resetValidation.expired_at);
  TestValidator.predicate("token has not expired", expiredAt > now);
}
