import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that attempting to update a non-existent guest token returns an
 * appropriate error response. This scenario validates error handling for
 * invalid guest tokens during update operations. The test authenticates as a
 * moderator, then attempts to update a guest record using a randomly generated
 * or invalid guest token. Verification ensures the system properly handles
 * non-existent guest tokens with appropriate error responses.
 */
export async function test_api_guest_update_nonexistent_token(
  connection: api.IConnection,
) {
  // Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.name(1),
      password: "testpassword123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      moderation_level: "basic",
      ip: "127.0.0.1",
      href: "https://example.com/auth/moderator/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Generate a random invalid guest token that doesn't exist in the system
  const nonExistentGuestToken = typia.random<string & tags.Format<"uuid">>();

  // Attempt to update the non-existent guest record - this should fail
  await TestValidator.error(
    "updating non-existent guest token should return error",
    async () => {
      await api.functional.discussionBoard.moderator.guests.update(connection, {
        guestToken: nonExistentGuestToken,
        body: {
          deleted_at: new Date().toISOString(),
        } satisfies IDiscussionBoardGuest.IUpdate,
      });
    },
  );
}
