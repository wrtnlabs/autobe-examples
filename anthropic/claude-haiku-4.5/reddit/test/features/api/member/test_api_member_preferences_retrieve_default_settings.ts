import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPreference";

/**
 * Test retrieving member preferences for a newly created account with default
 * settings.
 *
 * A new member joins the platform by registering with email, username, and
 * password credentials. The test verifies that after successful account
 * creation, the member preferences endpoint returns the initialized default
 * preference values. The response includes:
 *
 * - Notification_frequency set to 'daily'
 * - All notification toggles enabled (posts, comments, mentions, moderator
 *   actions)
 * - Profile publicly visible
 * - Post and comment history visible
 * - Karma displayed publicly
 * - Activity status hidden (default private behavior)
 * - Direct messages from anyone allowed
 * - NSFW content hidden (default safety)
 * - Inline media expansion enabled
 * - Links opening in new tab
 *
 * This test validates that a fresh member account immediately has a complete
 * preference record with sensible defaults rather than null values, ensuring
 * all preference fields contain their proper default values upon account
 * creation.
 */
export async function test_api_member_preferences_retrieve_default_settings(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const password = RandomGenerator.alphabets(10);

  const memberRegistered: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        username,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });

  typia.assert(memberRegistered);
  TestValidator.equals(
    "member account created successfully",
    typeof memberRegistered.id,
    "string",
  );
  TestValidator.equals(
    "authentication token returned",
    typeof memberRegistered.token.access,
    "string",
  );

  // Step 2: Retrieve the member preferences using the newly created member ID
  const preferences: ICommunityPlatformMemberPreference =
    await api.functional.communityPlatform.member.members.preferences.at(
      connection,
      {
        memberId: memberRegistered.id,
      },
    );

  typia.assert(preferences);

  // Step 3: Validate all default preference values
  TestValidator.equals(
    "notification_frequency defaults to daily",
    preferences.notification_frequency,
    "daily",
  );

  TestValidator.equals(
    "notify_on_post_upvotes defaults to true",
    preferences.notify_on_post_upvotes,
    true,
  );

  TestValidator.equals(
    "notify_on_comment_upvotes defaults to true",
    preferences.notify_on_comment_upvotes,
    true,
  );

  TestValidator.equals(
    "notify_on_comment_replies defaults to true",
    preferences.notify_on_comment_replies,
    true,
  );

  TestValidator.equals(
    "notify_on_mentions defaults to true",
    preferences.notify_on_mentions,
    true,
  );

  TestValidator.equals(
    "notify_on_community_updates defaults to true",
    preferences.notify_on_community_updates,
    true,
  );

  TestValidator.equals(
    "notify_on_moderator_actions defaults to true",
    preferences.notify_on_moderator_actions,
    true,
  );

  TestValidator.equals(
    "show_profile_publicly defaults to true",
    preferences.show_profile_publicly,
    true,
  );

  TestValidator.equals(
    "show_post_history defaults to true",
    preferences.show_post_history,
    true,
  );

  TestValidator.equals(
    "show_comment_history defaults to true",
    preferences.show_comment_history,
    true,
  );

  TestValidator.equals(
    "show_karma_publicly defaults to true",
    preferences.show_karma_publicly,
    true,
  );

  TestValidator.equals(
    "show_activity_status defaults to false (private)",
    preferences.show_activity_status,
    false,
  );

  TestValidator.equals(
    "allow_direct_messages defaults to anyone",
    preferences.allow_direct_messages,
    "anyone",
  );

  TestValidator.equals(
    "hide_nsfw_content defaults to true",
    preferences.hide_nsfw_content,
    true,
  );

  TestValidator.equals(
    "expand_inline_media defaults to true",
    preferences.expand_inline_media,
    true,
  );

  TestValidator.equals(
    "open_links_new_tab defaults to true",
    preferences.open_links_new_tab,
    true,
  );

  // Step 4: Verify preference record is linked to the correct member
  TestValidator.equals(
    "preference member_id matches created member",
    preferences.community_platform_member_id,
    memberRegistered.id,
  );

  // Step 5: Verify timestamps are present and properly formatted
  TestValidator.predicate(
    "created_at timestamp is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(preferences.created_at),
  );

  TestValidator.predicate(
    "updated_at timestamp is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(preferences.updated_at),
  );
}
