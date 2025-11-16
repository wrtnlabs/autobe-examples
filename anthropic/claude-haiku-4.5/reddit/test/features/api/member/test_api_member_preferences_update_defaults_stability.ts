import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPreference";

export async function test_api_member_preferences_update_defaults_stability(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with default preferences
  const memberCreated = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberCreated);

  const memberId = memberCreated.id;

  // Step 2: Get initial preferences to verify defaults
  const initialPreferences =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId,
        body: {} satisfies ICommunityPlatformMemberPreference.IUpdate,
      },
    );
  typia.assert(initialPreferences);

  // Document the default values
  const defaultNotificationFrequency =
    initialPreferences.notification_frequency;
  const defaultNotifyOnPostUpvotes = initialPreferences.notify_on_post_upvotes;
  const defaultNotifyOnCommentUpvotes =
    initialPreferences.notify_on_comment_upvotes;
  const defaultNotifyOnCommentReplies =
    initialPreferences.notify_on_comment_replies;
  const defaultNotifyOnMentions = initialPreferences.notify_on_mentions;
  const defaultNotifyOnCommunityUpdates =
    initialPreferences.notify_on_community_updates;
  const defaultNotifyOnModeratorActions =
    initialPreferences.notify_on_moderator_actions;
  const defaultShowProfilePublicly = initialPreferences.show_profile_publicly;
  const defaultShowPostHistory = initialPreferences.show_post_history;
  const defaultShowCommentHistory = initialPreferences.show_comment_history;
  const defaultShowKarmaPublicly = initialPreferences.show_karma_publicly;
  const defaultShowActivityStatus = initialPreferences.show_activity_status;
  const defaultAllowDirectMessages = initialPreferences.allow_direct_messages;
  const defaultHideNsfwContent = initialPreferences.hide_nsfw_content;
  const defaultExpandInlineMedia = initialPreferences.expand_inline_media;
  const defaultOpenLinksNewTab = initialPreferences.open_links_new_tab;

  // Step 3: Update only hide_nsfw_content to false
  const updatedPreferences =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId,
        body: {
          hide_nsfw_content: false,
        } satisfies ICommunityPlatformMemberPreference.IUpdate,
      },
    );
  typia.assert(updatedPreferences);

  // Step 4: Verify the update was applied
  TestValidator.equals(
    "hide_nsfw_content should be updated to false",
    updatedPreferences.hide_nsfw_content,
    false,
  );

  // Step 5: Validate that all other fields retain their default values
  TestValidator.equals(
    "notification_frequency should remain unchanged",
    updatedPreferences.notification_frequency,
    defaultNotificationFrequency,
  );

  TestValidator.equals(
    "notify_on_post_upvotes should remain unchanged",
    updatedPreferences.notify_on_post_upvotes,
    defaultNotifyOnPostUpvotes,
  );

  TestValidator.equals(
    "notify_on_comment_upvotes should remain unchanged",
    updatedPreferences.notify_on_comment_upvotes,
    defaultNotifyOnCommentUpvotes,
  );

  TestValidator.equals(
    "notify_on_comment_replies should remain unchanged",
    updatedPreferences.notify_on_comment_replies,
    defaultNotifyOnCommentReplies,
  );

  TestValidator.equals(
    "notify_on_mentions should remain unchanged",
    updatedPreferences.notify_on_mentions,
    defaultNotifyOnMentions,
  );

  TestValidator.equals(
    "notify_on_community_updates should remain unchanged",
    updatedPreferences.notify_on_community_updates,
    defaultNotifyOnCommunityUpdates,
  );

  TestValidator.equals(
    "notify_on_moderator_actions should remain unchanged",
    updatedPreferences.notify_on_moderator_actions,
    defaultNotifyOnModeratorActions,
  );

  TestValidator.equals(
    "show_profile_publicly should remain unchanged",
    updatedPreferences.show_profile_publicly,
    defaultShowProfilePublicly,
  );

  TestValidator.equals(
    "show_post_history should remain unchanged",
    updatedPreferences.show_post_history,
    defaultShowPostHistory,
  );

  TestValidator.equals(
    "show_comment_history should remain unchanged",
    updatedPreferences.show_comment_history,
    defaultShowCommentHistory,
  );

  TestValidator.equals(
    "show_karma_publicly should remain unchanged",
    updatedPreferences.show_karma_publicly,
    defaultShowKarmaPublicly,
  );

  TestValidator.equals(
    "show_activity_status should remain unchanged",
    updatedPreferences.show_activity_status,
    defaultShowActivityStatus,
  );

  TestValidator.equals(
    "allow_direct_messages should remain unchanged",
    updatedPreferences.allow_direct_messages,
    defaultAllowDirectMessages,
  );

  TestValidator.equals(
    "expand_inline_media should remain unchanged",
    updatedPreferences.expand_inline_media,
    defaultExpandInlineMedia,
  );

  TestValidator.equals(
    "open_links_new_tab should remain unchanged",
    updatedPreferences.open_links_new_tab,
    defaultOpenLinksNewTab,
  );
}
