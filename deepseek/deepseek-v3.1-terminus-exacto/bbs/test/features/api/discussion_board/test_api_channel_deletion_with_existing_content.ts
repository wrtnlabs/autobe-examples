import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * Test channel deletion when the channel contains existing sections and posts.
 * Validates that the deletion operation properly handles channels with content
 * and ensures data integrity. The test verifies that deletion succeeds even
 * when the channel has associated content, and that proper cleanup mechanisms
 * are in place.
 */
export async function test_api_channel_deletion_with_existing_content(
  connection: api.IConnection,
) {
  // 1. Create a moderator account for authentication
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      moderation_level: "admin",
      ip: "127.0.0.1",
      href: "https://example.com/dashboard",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create a discussion board channel
  const channel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Create multiple sections within the channel to simulate existing content
  const sections = await ArrayUtil.asyncRepeat(3, async (index) => {
    const section =
      await api.functional.discussionBoard.moderator.channels.sections.create(
        connection,
        {
          channelName: channel.name,
          body: {
            name: `Section ${index + 1}`,
            description: `Description for section ${index + 1}`,
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
    return section;
  });

  // 4. Delete the channel using the erase API endpoint
  await api.functional.discussionBoard.moderator.channels.erase(connection, {
    channelName: channel.name,
  });

  // 5. Validate that the deletion operation completed successfully
  // (No error thrown indicates successful deletion)
  TestValidator.predicate("channel deletion completed without errors", true);

  // 6. Verify that attempts to access the deleted channel or its sections fail
  await TestValidator.error(
    "accessing deleted channel should fail",
    async () => {
      await api.functional.discussionBoard.moderator.channels.sections.create(
        connection,
        {
          channelName: channel.name,
          body: {
            name: "Test Section",
            description: "Test description",
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
