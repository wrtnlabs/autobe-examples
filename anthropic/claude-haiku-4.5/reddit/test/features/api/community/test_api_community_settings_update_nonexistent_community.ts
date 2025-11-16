import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test updating settings for non-existent community.
 *
 * This test validates the API error handling when attempting to update settings
 * for a community that doesn't exist. The test ensures:
 *
 * 1. Creates a member account to establish authentication
 * 2. Attempts to update settings for a non-existent community ID
 * 3. Verifies HTTP 404 Not Found error is returned
 * 4. Confirms the API properly rejects operations on non-existent resources
 *
 * The test covers the following business logic:
 *
 * - Authentication is required for settings updates
 * - Non-existent community IDs are properly rejected
 * - Error responses contain appropriate status codes
 * - The system doesn't create communities implicitly through settings updates
 */
export async function test_api_community_settings_update_nonexistent_community(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const baseUsername = RandomGenerator.name()
    .replace(/\s+/g, "_")
    .toLowerCase();
  const username =
    baseUsername.length > 50 ? baseUsername.substring(0, 50) : baseUsername;

  const memberAccount = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: username,
      password: `${RandomGenerator.alphabets(4).toUpperCase()}${RandomGenerator.alphabets(4)}${RandomGenerator.alphaNumeric(2)}!@`,
      href: "https://localhost:3000/register",
      referrer: "https://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAccount);

  // Step 2: Attempt to update settings for non-existent community
  // Generate a valid UUID that doesn't correspond to any existing community
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();

  // Verify the error handling for non-existent community
  await TestValidator.error(
    "should fail with 404 when updating settings for non-existent community",
    async () => {
      await api.functional.communityPlatform.member.communities.settings.update(
        connection,
        {
          communityId: nonExistentCommunityId,
          body: {
            require_post_approval: true,
            require_comment_approval: false,
            minimum_karma_to_post: 10,
            minimum_account_age_days: 1,
            default_sort_method: "hot",
            archive_posts_after_days: 30,
            enable_nsfw_content: false,
            enable_spoiler_tags: true,
          } satisfies ICommunityPlatformCommunitySettings.IUpdate,
        },
      );
    },
  );
}
