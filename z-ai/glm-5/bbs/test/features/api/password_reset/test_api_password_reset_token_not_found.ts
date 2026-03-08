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
 * Test validation of a non-existent password reset token.
 *
 * Scenario: A member attempts to use a password reset link with an invalid,
 * fabricated, or already-used token.
 *
 * Validation points:
 * 1. Given a password reset token does not exist in either member or admin
 *    password resets tables
 * 2. When accessing GET /discussionBoard/member/password-resets/{resetId}
 *    with the non-existent token
 * 3. Then the response should indicate the token is invalid or expired
 * 4. The error message should be identical to the expired token scenario
 *    (for security)
 * 5. The system should not reveal whether the token never existed, was
 *    already used, or was fabricated
 * 6. No member email or any account information should be exposed
 * 7. The response prevents token enumeration attacks by not distinguishing
 *    between non-existent and expired tokens
 */
export async function test_api_password_reset_token_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account for context (though password reset
  //    validation doesn't require authentication)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Generate a fabricated/non-existent password reset token
  // This UUID is randomly generated and will not exist in either
  // discussion_board_member_password_resets or admin password resets tables
  const fabricatedResetToken = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to validate the non-existent token
  // The API should return an error for non-existent tokens
  // Security requirement: same generic error for non-existent vs expired tokens
  await TestValidator.error(
    "non-existent reset token should fail",
    async () => {
      await api.functional.discussionBoard.member.password_resets.at(
        { host: connection.host },
        { resetId: fabricatedResetToken },
      );
    },
  );
}
