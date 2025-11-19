import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test discussion board channel status transitions to validate moderators can
 * change channel status between active, inactive, and archived states. Tests
 * complete workflow including moderator authentication, channel creation, and
 * multiple status transitions with validation of expected system behavior and
 * data integrity.
 */
export async function test_api_discussion_board_channel_update_status_transitions(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 8,
      }),
      password: "testPassword123",
      display_name: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 2,
        wordMax: 6,
      }),
      bio: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 10 }),
      moderation_level: "senior",
      ip: "192.168.1.1",
      href: "https://example.com/auth/moderator/join",
      referrer: "https://example.com/dashboard",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create initial discussion channel with active status
  const channelName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const initialChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: channelName,
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(initialChannel);
  TestValidator.equals(
    "initial channel created with active status",
    initialChannel.status,
    "active",
  );
  TestValidator.equals(
    "channel name matches creation data",
    initialChannel.name,
    channelName,
  );

  // Step 3: Test transition from active to inactive status
  const inactiveChannel =
    await api.functional.discussionBoard.moderator.channels.update(connection, {
      channelName: initialChannel.name,
      body: {
        status: "inactive",
      } satisfies IDiscussionBoardChannel.IUpdate,
    });
  typia.assert(inactiveChannel);
  TestValidator.equals(
    "channel status changed to inactive",
    inactiveChannel.status,
    "inactive",
  );
  TestValidator.equals(
    "channel name remains unchanged",
    inactiveChannel.name,
    initialChannel.name,
  );
  TestValidator.equals(
    "channel description remains unchanged",
    inactiveChannel.description,
    initialChannel.description,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    inactiveChannel.updated_at,
    initialChannel.updated_at,
  );

  // Step 4: Test transition from inactive to archived status
  const archivedChannel =
    await api.functional.discussionBoard.moderator.channels.update(connection, {
      channelName: inactiveChannel.name,
      body: {
        status: "archived",
      } satisfies IDiscussionBoardChannel.IUpdate,
    });
  typia.assert(archivedChannel);
  TestValidator.equals(
    "channel status changed to archived",
    archivedChannel.status,
    "archived",
  );
  TestValidator.equals(
    "channel name remains unchanged",
    archivedChannel.name,
    inactiveChannel.name,
  );
  TestValidator.equals(
    "channel description remains unchanged",
    archivedChannel.description,
    inactiveChannel.description,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed again",
    archivedChannel.updated_at,
    inactiveChannel.updated_at,
  );

  // Step 5: Test transition from archived back to active status
  const reactivatedChannel =
    await api.functional.discussionBoard.moderator.channels.update(connection, {
      channelName: archivedChannel.name,
      body: {
        status: "active",
      } satisfies IDiscussionBoardChannel.IUpdate,
    });
  typia.assert(reactivatedChannel);
  TestValidator.equals(
    "channel status restored to active",
    reactivatedChannel.status,
    "active",
  );
  TestValidator.equals(
    "channel name remains unchanged",
    reactivatedChannel.name,
    archivedChannel.name,
  );
  TestValidator.equals(
    "channel description remains unchanged",
    reactivatedChannel.description,
    archivedChannel.description,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed for final status",
    reactivatedChannel.updated_at,
    archivedChannel.updated_at,
  );

  // Step 6: Validate all status transitions maintained core properties
  TestValidator.equals(
    "channel ID remains constant throughout transitions",
    reactivatedChannel.id,
    initialChannel.id,
  );
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    reactivatedChannel.created_at,
    initialChannel.created_at,
  );
  TestValidator.equals(
    "deleted_at remains undefined for active channels",
    reactivatedChannel.deleted_at,
    undefined,
  );
}
