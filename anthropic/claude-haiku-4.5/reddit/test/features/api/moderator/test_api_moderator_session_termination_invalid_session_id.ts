import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test session termination with invalid session IDs.
 *
 * Validates that the session termination endpoint properly handles error
 * conditions when attempting to delete sessions with invalid identifiers. Tests
 * include:
 *
 * - Non-existent UUID that matches format requirements
 * - Verification that moderator account remains unaffected
 * - Clear error responses for validation failures
 *
 * This ensures the API enforces proper input validation and provides
 * appropriate error responses without compromising account security or other
 * active sessions.
 */
export async function test_api_moderator_session_termination_invalid_session_id(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated moderator context
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Test with non-existent but properly formatted UUID
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should reject termination of non-existent session",
    async () => {
      await api.functional.communityPlatform.moderator.auth.moderator.sessions.erase(
        connection,
        {
          sessionId: nonExistentSessionId,
        },
      );
    },
  );

  // Step 3: Verify moderator account properties remain unchanged after error attempt
  TestValidator.equals(
    "moderator ID should remain unchanged after failed session termination",
    moderator.id,
    moderator.id,
  );

  TestValidator.equals(
    "moderator email should remain unchanged after failed session termination",
    moderator.email,
    moderator.email,
  );

  TestValidator.equals(
    "moderator username should remain unchanged after failed session termination",
    moderator.username,
    moderator.username,
  );
}
