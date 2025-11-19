import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test guest retrieval error handling for non-existent tokens.
 *
 * This test validates that the discussion board moderator API properly handles
 * requests for guest information using tokens that don't exist in the system.
 * The scenario ensures that appropriate error responses are returned when
 * attempting to access guest records with invalid or non-existent tokens,
 * maintaining platform security and preventing unauthorized access attempts.
 *
 * Implementation Steps:
 *
 * 1. Create a moderator account with proper authentication credentials
 * 2. Generate a random string that simulates a non-existent guest token
 * 3. Attempt to retrieve guest information using the invalid token
 * 4. Verify the API properly rejects the request with an error response
 */
export async function test_api_guest_retrieval_nonexistent_token(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account to establish authentication context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 8,
      }),
      password: "securePassword123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 5 }),
      moderation_level: "senior",
      ip: "192.168.1.1",
      href: "https://discussionboard.example.com/moderator/dashboard",
      referrer: "https://discussionboard.example.com/",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Generate a random string that does not match any valid guest token format
  const nonExistentToken = RandomGenerator.alphaNumeric(36);

  // Step 3 & 4: Attempt to retrieve guest information and verify error response
  await TestValidator.error(
    "API should reject guest retrieval with non-existent token",
    async () => {
      await api.functional.discussionBoard.moderator.guests.at(connection, {
        guestToken: nonExistentToken,
      });
    },
  );
}
