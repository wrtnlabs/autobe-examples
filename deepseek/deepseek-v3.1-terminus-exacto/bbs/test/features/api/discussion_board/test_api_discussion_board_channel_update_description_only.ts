import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test partial update of channel description without modifying other
 * properties.
 *
 * This test validates that moderators can perform targeted updates to specific
 * channel attributes while leaving other fields unchanged. The test verifies
 * that partial updates work correctly and that system-managed fields remain
 * unaffected.
 */
export async function test_api_discussion_board_channel_update_description_only(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator for channel update operations
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 7,
      }),
      password: "testPassword123",
      display_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 2,
        wordMax: 4,
      }),
      bio: RandomGenerator.paragraph(),
      moderation_level: "admin",
      ip: "192.168.1.1",
      href: "https://example.com/dashboard",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create initial channel for partial update testing
  const initialChannelName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const initialDescription = RandomGenerator.paragraph();
  const initialStatus = "active";

  const createdChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: initialChannelName,
        description: initialDescription,
        status: initialStatus,
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(createdChannel);

  // Verify initial channel data
  TestValidator.equals(
    "channel name matches",
    createdChannel.name,
    initialChannelName,
  );
  TestValidator.equals(
    "channel description matches",
    createdChannel.description,
    initialDescription,
  );
  TestValidator.equals(
    "channel status matches",
    createdChannel.status,
    initialStatus,
  );
  TestValidator.predicate(
    "channel has creation timestamp",
    createdChannel.created_at !== undefined,
  );
  TestValidator.predicate(
    "channel has update timestamp",
    createdChannel.updated_at !== undefined,
  );

  // Step 3: Update only the description field using correct IUpdate type
  const newDescription = RandomGenerator.paragraph();

  const updatedChannel =
    await api.functional.discussionBoard.moderator.channels.update(connection, {
      channelName: createdChannel.name,
      body: {
        description: newDescription,
        // Intentionally omit name and status to test partial update
      } satisfies IDiscussionBoardChannel.IUpdate,
    });
  typia.assert(updatedChannel);

  // Step 4: Validate partial update results
  // Verify description was updated
  TestValidator.equals(
    "description was updated",
    updatedChannel.description,
    newDescription,
  );

  // Verify name remains unchanged (immutable by API design)
  TestValidator.equals(
    "name remains unchanged",
    updatedChannel.name,
    createdChannel.name,
  );

  // Verify status remains unchanged (intentionally omitted in update)
  TestValidator.equals(
    "status remains unchanged",
    updatedChannel.status,
    createdChannel.status,
  );

  // Verify system-managed fields are properly handled
  TestValidator.equals(
    "created_at remains unchanged",
    updatedChannel.created_at,
    createdChannel.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp was updated",
    updatedChannel.updated_at !== createdChannel.updated_at,
  );

  // Step 5: Core validation - only description should have changed
  TestValidator.notEquals(
    "description is different from original",
    updatedChannel.description,
    createdChannel.description,
  );
  TestValidator.equals(
    "only description field changed",
    {
      name: updatedChannel.name,
      status: updatedChannel.status,
      created_at: updatedChannel.created_at,
    },
    {
      name: createdChannel.name,
      status: createdChannel.status,
      created_at: createdChannel.created_at,
    },
  );
}
