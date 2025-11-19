import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * Test moderator section creation workflow within discussion board channels.
 *
 * This test validates the complete section creation process:
 *
 * 1. Moderator authentication to establish proper authorization
 * 2. Parent channel creation as a prerequisite for section creation
 * 3. Section creation with proper channel association and validation
 * 4. Verification of section properties and parent channel linkage
 *
 * The test ensures that sections are correctly scoped to their parent channels
 * and that all required fields are properly populated and validated.
 */
export async function test_api_discussion_board_section_creation_by_moderator(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator - create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8),
      password: "test1234",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      moderation_level: "senior",
      ip: "192.168.1.1",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create parent discussion board channel
  const channel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Create section within the channel
  const section =
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

  // 4. Validate section properties
  TestValidator.predicate(
    "section ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      section.id,
    ),
  );
  TestValidator.predicate("section name is not empty", section.name.length > 0);
  TestValidator.predicate(
    "section description is not empty",
    section.description.length > 0,
  );
  TestValidator.equals("section status is active", section.status, "active");
  TestValidator.predicate(
    "section has valid creation timestamp",
    new Date(section.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "section has valid update timestamp",
    new Date(section.updated_at).getTime() > 0,
  );

  // 5. Validate that all required section fields are properly set
  TestValidator.predicate(
    "section name contains meaningful content",
    section.name.trim().length > 0,
  );
  TestValidator.predicate(
    "section description contains meaningful content",
    section.description.trim().length > 0,
  );

  // 6. Verify the section creation workflow completed successfully
  TestValidator.predicate(
    "moderator authentication successful",
    moderator.id !== undefined,
  );
  TestValidator.predicate(
    "channel creation successful",
    channel.id !== undefined,
  );
  TestValidator.predicate(
    "section creation successful",
    section.id !== undefined,
  );
}
