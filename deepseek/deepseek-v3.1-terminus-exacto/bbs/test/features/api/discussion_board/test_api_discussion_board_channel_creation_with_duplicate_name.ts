import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test channel creation failure when attempting to create a channel with a
 * duplicate name. Validates the uniqueness constraint on channel names by
 * creating an initial channel and then attempting to create a second channel
 * with the same name. The test ensures the system properly rejects duplicate
 * channel names and maintains content organization integrity.
 */
export async function test_api_discussion_board_channel_creation_with_duplicate_name(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator to establish authorization context
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "testPassword123",
        display_name: RandomGenerator.name(2),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        moderation_level: "basic",
        ip: "192.168.1.1",
        href: "https://example.com/dashboard",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create initial channel with unique name
  const channelName = RandomGenerator.paragraph({ sentences: 2 });
  const initialChannel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: channelName,
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(initialChannel);
  TestValidator.equals(
    "initial channel name matches input",
    initialChannel.name,
    channelName,
  );

  // 3. Attempt to create duplicate channel with same name
  await TestValidator.error("duplicate channel name should fail", async () => {
    return await api.functional.discussionBoard.moderator.channels.create(
      connection,
      {
        body: {
          name: channelName,
          description: RandomGenerator.content({ paragraphs: 1 }),
          status: "active",
        } satisfies IDiscussionBoardChannel.ICreate,
      },
    );
  });

  // 4. Create a new channel with a different name to ensure the system is still functional
  const newChannel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(newChannel);
  TestValidator.notEquals(
    "new channel name should be different from the duplicate name",
    newChannel.name,
    channelName,
  );
}
