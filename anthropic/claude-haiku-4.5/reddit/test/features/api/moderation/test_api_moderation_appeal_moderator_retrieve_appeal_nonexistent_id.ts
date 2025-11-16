import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAppeal";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test moderator attempting to retrieve an appeal with a nonexistent UUID.
 *
 * This test validates proper 404 error handling when a moderator tries to
 * retrieve a moderation appeal that does not exist. The scenario includes:
 *
 * 1. Register a moderator account to establish authentication
 * 2. Attempt to retrieve an appeal using a valid UUID format but nonexistent ID
 * 3. Verify that the API returns a 404 error indicating the appeal was not found
 * 4. Confirm error handling is correct for missing resource lookups
 */
export async function test_api_moderation_appeal_moderator_retrieve_appeal_nonexistent_id(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Attempt to retrieve appeal with nonexistent UUID
  const nonexistentAppealId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Verify 404 error is returned for nonexistent appeal
  await TestValidator.error(
    "should return error when retrieving nonexistent appeal",
    async () => {
      await api.functional.communityPlatform.moderator.moderationAppeals.at(
        connection,
        {
          appealId: nonexistentAppealId,
        },
      );
    },
  );
}
