import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * Test the complete workflow for updating a discussion board section by an
 * authenticated moderator. Validates moderator's ability to manage discussion
 * board organizational structure and ensure section updates maintain proper
 * relationships and data integrity.
 */
export async function test_api_discussion_board_section_update_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPassword123";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        moderation_level: "basic",
        ip: "127.0.0.1",
        href: "https://example.com/discussion-board",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create parent discussion board channel
  const channelName = RandomGenerator.alphabets(10);
  const channelDescription = RandomGenerator.paragraph({ sentences: 5 });

  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: channelName,
        description: channelDescription,
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create initial section within the channel
  const initialSectionName = RandomGenerator.alphabets(8);
  const initialSectionDescription = RandomGenerator.paragraph({ sentences: 4 });

  const initialSection: IDiscussionBoardSection =
    await api.functional.discussionBoard.moderator.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: initialSectionName,
          description: initialSectionDescription,
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
  typia.assert(initialSection);

  // Step 4: Create a second channel for section reassignment test
  const newChannelName = RandomGenerator.alphabets(10);
  const newChannelDescription = RandomGenerator.paragraph({ sentences: 5 });

  const newChannel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: newChannelName,
        description: newChannelDescription,
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(newChannel);

  // Step 5: Update section properties
  const updatedSectionName = RandomGenerator.alphabets(8);
  const updatedSectionDescription = RandomGenerator.paragraph({ sentences: 6 });

  const updatedSection: IDiscussionBoardSection =
    await api.functional.discussionBoard.moderator.channels.sections.update(
      connection,
      {
        channelName: channel.name,
        sectionName: initialSection.name,
        body: {
          name: updatedSectionName,
          description: updatedSectionDescription,
          channel: {
            id: newChannel.id,
            name: newChannel.name,
            description: newChannel.description,
            status: newChannel.status,
            created_at: newChannel.created_at,
          } satisfies IDiscussionBoardChannel.ISummary,
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection);

  // Step 6: Validate that section updates are correctly applied
  TestValidator.equals(
    "section ID should remain unchanged",
    updatedSection.id,
    initialSection.id,
  );
  TestValidator.equals(
    "section name should be updated",
    updatedSection.name,
    updatedSectionName,
  );
  TestValidator.equals(
    "section description should be updated",
    updatedSection.description,
    updatedSectionDescription,
  );
  TestValidator.equals(
    "section status should remain unchanged",
    updatedSection.status,
    initialSection.status,
  );
  TestValidator.notEquals(
    "updated at timestamp should change",
    updatedSection.updated_at,
    initialSection.updated_at,
  );
}
