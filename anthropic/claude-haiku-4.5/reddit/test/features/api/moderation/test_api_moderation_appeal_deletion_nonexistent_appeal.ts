import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test deletion of a non-existent moderation appeal.
 *
 * This scenario validates proper error handling when attempting to delete a
 * moderation appeal using an invalid or non-existent appealId. The test follows
 * these steps:
 *
 * 1. Authenticate as a moderator with valid credentials
 * 2. Attempt to delete an appeal using a random UUID that doesn't exist
 * 3. Verify that the operation returns an appropriate error response
 *
 * This ensures the API correctly handles requests for non-existent resources
 * and provides meaningful error feedback to the client.
 */
export async function test_api_moderation_appeal_deletion_nonexistent_appeal(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Attempt to delete a non-existent appeal using a random UUID
  const nonExistentAppealId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Verify that deletion of non-existent appeal returns error
  await TestValidator.error(
    "deletion of non-existent appeal should fail",
    async () => {
      await api.functional.communityPlatform.moderator.moderationAppeals.erase(
        connection,
        {
          appealId: nonExistentAppealId,
        },
      );
    },
  );
}
