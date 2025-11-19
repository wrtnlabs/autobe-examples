import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_discussion_board_channel_update_nonexistent_channel(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.paragraph({ sentences: 1 }),
        password: "testPassword123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        moderation_level: "admin",
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Attempt to update a non-existent channel
  const nonExistentChannelName = RandomGenerator.paragraph({ sentences: 1 });
  const updateData = {
    description: "Attempted update description",
    status: "active",
  } satisfies IDiscussionBoardChannel.IUpdate;

  // 3. Validate that the API call fails with proper error response
  await TestValidator.error(
    "updating non-existent channel should fail",
    async () => {
      await api.functional.discussionBoard.moderator.channels.update(
        connection,
        {
          channelName: nonExistentChannelName,
          body: updateData,
        },
      );
    },
  );
}
