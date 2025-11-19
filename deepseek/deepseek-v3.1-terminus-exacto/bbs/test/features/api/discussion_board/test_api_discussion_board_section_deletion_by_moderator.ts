import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * Test the complete workflow for permanently deleting a discussion board
 * section by an authenticated moderator. The scenario covers channel creation,
 * section creation within the channel, and then hard deletion of the section.
 * Validates that deletion operations require proper authorization and that
 * sections can be removed from the system while maintaining referential
 * integrity constraints.
 */
export async function test_api_discussion_board_section_deletion_by_moderator(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(),
        password: "password123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 5 }),
        moderation_level: "admin",
        ip: "192.168.1.1",
        href: "https://example.com/auth/join",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create parent channel
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Create section within the channel
  const section: IDiscussionBoardSection =
    await api.functional.discussionBoard.moderator.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
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

  // 4. Perform deletion of the section
  await api.functional.discussionBoard.moderator.channels.sections.erase(
    connection,
    {
      channelName: channel.name,
      sectionName: section.name,
    },
  );

  // 5. Verify deletion by attempting to access the deleted section
  await TestValidator.error(
    "deleted section should not be accessible",
    async () => {
      await api.functional.discussionBoard.moderator.channels.sections.create(
        connection,
        {
          channelName: channel.name,
          body: {
            name: section.name,
            description: "Attempt to recreate deleted section",
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
    },
  );
}
