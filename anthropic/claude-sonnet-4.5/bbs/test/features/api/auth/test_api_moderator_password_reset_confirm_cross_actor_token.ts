import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test password reset confirmation using a reset token generated for a
 * different actor type.
 *
 * This test validates the Compatible Actor Pattern enforcement where moderator
 * reset tokens must have actor_type='moderator' in
 * discussion_board_password_resets. It creates a member account, requests
 * member password reset (which creates a token with actor_type='member'), then
 * attempts to use a token in the moderator password reset endpoint.
 *
 * NOTE: This test uses a randomly generated UUID as a token placeholder because
 * actual reset tokens are sent via email and not returned in API responses. In
 * a real scenario, this test would require access to the email system or a
 * test-specific endpoint that exposes tokens. The test validates that invalid
 * tokens are rejected, though it cannot specifically test the cross-actor
 * validation without access to actual member tokens.
 *
 * Steps:
 *
 * 1. Create a member account via registration
 * 2. Request password reset for the member (generates member-type token)
 * 3. Attempt to use an invalid token in moderator password reset confirmation
 * 4. Validate that the operation fails
 */
export async function test_api_moderator_password_reset_confirm_cross_actor_token(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Request password reset for the member account
  // This generates a token with actor_type='member' in discussion_board_password_resets
  const resetResponse =
    await api.functional.auth.member.password.reset.requestPasswordReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies IDiscussionBoardMember.IRequestPasswordReset,
      },
    );
  typia.assert(resetResponse);

  // Step 3: Attempt to use an invalid token in the moderator password reset endpoint
  // Since actual tokens are sent via email and not returned in responses, we use a random UUID
  // This tests that invalid/non-existent tokens are properly rejected
  const randomToken = typia.random<string & tags.Format<"uuid">>();
  const newModeratorPassword = typia.random<string & tags.MinLength<8>>();

  await TestValidator.error(
    "moderator password reset should reject invalid token",
    async () => {
      await api.functional.auth.moderator.password.reset.confirm.resetPassword(
        connection,
        {
          body: {
            token: randomToken,
            password: newModeratorPassword,
          } satisfies IDiscussionBoardModerator.IResetPassword,
        },
      );
    },
  );
}
