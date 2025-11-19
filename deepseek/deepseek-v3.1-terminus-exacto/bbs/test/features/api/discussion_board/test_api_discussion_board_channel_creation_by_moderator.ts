import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful creation of a new discussion board channel by an
 * authenticated moderator.
 *
 * This test validates that a moderator can create a channel with valid
 * properties and that the channel is properly created with system-generated
 * fields. It ensures the discussion board platform correctly handles channel
 * creation with proper authorization and business rule validation.
 */
export async function test_api_discussion_board_channel_creation_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account to establish authentication context
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorData = {
    email: moderatorEmail,
    username: RandomGenerator.name(1),
    password: "securePassword123",
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    moderation_level: "senior",
    ip: "192.168.1.1",
    href: "https://example.com/dashboard" satisfies string as string &
      tags.Format<"uri">,
    referrer: "https://example.com" satisfies string as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a channel with valid properties
  const channelData = {
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 4,
      wordMax: 9,
    }),
    status: "active",
  } satisfies IDiscussionBoardChannel.ICreate;

  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: channelData,
    });
  typia.assert(channel);

  // Step 3: Validate channel properties match input data
  TestValidator.equals(
    "channel name matches input",
    channel.name,
    channelData.name,
  );
  TestValidator.equals(
    "channel description matches input",
    channel.description,
    channelData.description,
  );
  TestValidator.equals(
    "channel status matches input",
    channel.status,
    channelData.status,
  );

  // Step 4: Verify system-generated fields are properly set
  TestValidator.predicate(
    "channel has valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      channel.id,
    ),
  );
  TestValidator.predicate(
    "created_at is valid ISO timestamp",
    /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?(Z|[+-]\\d{2}:\\d{2})$/.test(
      channel.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid ISO timestamp",
    /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?(Z|[+-]\\d{2}:\\d{2})$/.test(
      channel.updated_at,
    ),
  );
  TestValidator.equals(
    "deleted_at should be undefined for new channel",
    channel.deleted_at,
    undefined,
  );

  // Step 5: Test channel creation with different status
  const inactiveChannelData = {
    name: RandomGenerator.name(2) + " inactive",
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 6,
      wordMin: 5,
      wordMax: 10,
    }),
    status: "inactive",
  } satisfies IDiscussionBoardChannel.ICreate;

  const inactiveChannel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: inactiveChannelData,
    });
  typia.assert(inactiveChannel);

  TestValidator.equals(
    "inactive channel status matches input",
    inactiveChannel.status,
    "inactive",
  );
  TestValidator.predicate(
    "inactive channel has valid UUID ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      inactiveChannel.id,
    ),
  );

  // Step 6: Validate that channels have different IDs
  TestValidator.notEquals(
    "different channels should have different IDs",
    channel.id,
    inactiveChannel.id,
  );

  // Step 7: Test channel creation with archived status
  const archivedChannelData = {
    name: RandomGenerator.name(2) + " archived",
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "archived",
  } satisfies IDiscussionBoardChannel.ICreate;

  const archivedChannel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: archivedChannelData,
    });
  typia.assert(archivedChannel);

  TestValidator.equals(
    "archived channel status matches input",
    archivedChannel.status,
    "archived",
  );

  // Step 8: Test error handling for duplicate channel names
  await TestValidator.error(
    "should reject duplicate channel name",
    async () => {
      await api.functional.discussionBoard.moderator.channels.create(
        connection,
        { body: channelData } satisfies {
          body: IDiscussionBoardChannel.ICreate;
        },
      );
    },
  );

  // Step 9: Validate moderator info is correctly set
  TestValidator.equals(
    "moderator email matches input",
    moderator.email,
    moderatorData.email,
  );
  TestValidator.equals(
    "moderator username matches input",
    moderator.username,
    moderatorData.username,
  );
  TestValidator.equals(
    "moderator display_name matches input",
    moderator.display_name,
    moderatorData.display_name,
  );
  TestValidator.equals(
    "moderator moderation_level matches input",
    moderator.moderation_level,
    moderatorData.moderation_level,
  );
  TestValidator.predicate(
    "moderator has valid UUID ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderator.id,
    ),
  );
  TestValidator.predicate(
    "moderator has authentication token",
    moderator.token.access.length > 0,
  );
}
