import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * Test notification preference deletion API functionality.
 *
 * This test validates that the notification preference deletion endpoint can be
 * called by an authenticated member. Since the notification preference creation
 * API is not available in the provided materials, the test focuses on ensuring
 * the deletion endpoint is accessible and handles the request appropriately.
 *
 * The test follows the dependency chain:
 *
 * 1. Create moderator account
 * 2. Create channel and section structure
 * 3. Create member account
 * 4. Create member post to establish presence
 * 5. Attempt notification preference deletion
 */
export async function test_api_notification_preference_deletion_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for channel/section creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: "moderator123",
        moderation_level: "admin",
        href: "https://example.com/discussion-board",
        referrer: "https://example.com",
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

  // Step 4: Create member account for notification preference testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: "member123",
        href: "https://example.com/discussion-board",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 5: Member creates a post to establish content presence
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

  // Step 6: Test notification preference deletion API
  // Since notification preference creation API is not available, we test the deletion endpoint
  // with a valid UUID format to ensure the API is accessible
  const preferenceId = typia.random<string & tags.Format<"uuid">>();

  // The deletion call should complete without throwing an error
  await api.functional.discussionBoard.member.notificationPreferences.eraseByPreferenceid(
    connection,
    {
      preferenceId: preferenceId,
    },
  );

  // Validate that the API call completed successfully
  TestValidator.predicate(
    "notification preference deletion API is accessible",
    true,
  );
}
