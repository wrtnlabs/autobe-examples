import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationPreference";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * Validate granular notification preference category toggling functionality.
 *
 * This test establishes a complete discussion board ecosystem with
 * moderator-created channels and sections, member authentication, post
 * creation, and notification preference management. It specifically tests the
 * ability for members to selectively enable/disable individual notification
 * categories while maintaining granular control over their notification
 * preferences.
 */
export async function test_api_notification_preference_category_toggle(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: "moderator123",
        moderation_level: "admin",
        href: "https://discussion-board.example.com",
        referrer: "https://discussion-board.example.com/register",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create discussion board channel
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create section within the channel
  const section: IDiscussionBoardSection =
    await api.functional.discussionBoard.moderator.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          channel: {
            id: channel.id,
            name: channel.name,
            description: channel.description,
            status: channel.status,
            created_at: channel.created_at,
          } satisfies IDiscussionBoardChannel.ISummary,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);

  // Step 4: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "member123",
        href: "https://discussion-board.example.com",
        referrer: "https://discussion-board.example.com/register",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 5: Create member post to establish content presence
  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_channel_id: channel.id,
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Test individual notification category toggling
  // The member should have a default notification preference created automatically
  // We'll use a placeholder preference ID since the actual preference management
  // API pattern isn't fully defined in the provided materials

  // Test enabling post_interactions category
  const updatedWithPostInteractions: IDiscussionBoardNotificationPreference =
    await api.functional.discussionBoard.member.notificationPreferences.putByPreferenceid(
      connection,
      {
        preferenceId: member.id, // Using member ID as placeholder for preference ID
        body: {
          post_interactions: true,
        } satisfies IDiscussionBoardNotificationPreference.IUpdate,
      },
    );
  typia.assert(updatedWithPostInteractions);
  TestValidator.equals(
    "post_interactions should be enabled",
    updatedWithPostInteractions.post_interactions,
    true,
  );

  // Test enabling comment_replies category
  const updatedWithCommentReplies: IDiscussionBoardNotificationPreference =
    await api.functional.discussionBoard.member.notificationPreferences.putByPreferenceid(
      connection,
      {
        preferenceId: member.id,
        body: {
          comment_replies: true,
        } satisfies IDiscussionBoardNotificationPreference.IUpdate,
      },
    );
  typia.assert(updatedWithCommentReplies);
  TestValidator.equals(
    "comment_replies should be enabled",
    updatedWithCommentReplies.comment_replies,
    true,
  );

  // Test enabling moderation_updates category
  const updatedWithModerationUpdates: IDiscussionBoardNotificationPreference =
    await api.functional.discussionBoard.member.notificationPreferences.putByPreferenceid(
      connection,
      {
        preferenceId: member.id,
        body: {
          moderation_updates: true,
        } satisfies IDiscussionBoardNotificationPreference.IUpdate,
      },
    );
  typia.assert(updatedWithModerationUpdates);
  TestValidator.equals(
    "moderation_updates should be enabled",
    updatedWithModerationUpdates.moderation_updates,
    true,
  );

  // Test enabling system_announcements category
  const updatedWithSystemAnnouncements: IDiscussionBoardNotificationPreference =
    await api.functional.discussionBoard.member.notificationPreferences.putByPreferenceid(
      connection,
      {
        preferenceId: member.id,
        body: {
          system_announcements: true,
        } satisfies IDiscussionBoardNotificationPreference.IUpdate,
      },
    );
  typia.assert(updatedWithSystemAnnouncements);
  TestValidator.equals(
    "system_announcements should be enabled",
    updatedWithSystemAnnouncements.system_announcements,
    true,
  );

  // Test disabling specific category while keeping others enabled
  const updatedWithDisabledPostInteractions: IDiscussionBoardNotificationPreference =
    await api.functional.discussionBoard.member.notificationPreferences.putByPreferenceid(
      connection,
      {
        preferenceId: member.id,
        body: {
          post_interactions: false,
        } satisfies IDiscussionBoardNotificationPreference.IUpdate,
      },
    );
  typia.assert(updatedWithDisabledPostInteractions);
  TestValidator.equals(
    "post_interactions should be disabled",
    updatedWithDisabledPostInteractions.post_interactions,
    false,
  );

  // Final validation that the preference updates are working correctly
  TestValidator.predicate(
    "notification preference system supports granular category control",
    updatedWithDisabledPostInteractions.comment_replies === true &&
      updatedWithDisabledPostInteractions.moderation_updates === true &&
      updatedWithDisabledPostInteractions.system_announcements === true,
  );
}
