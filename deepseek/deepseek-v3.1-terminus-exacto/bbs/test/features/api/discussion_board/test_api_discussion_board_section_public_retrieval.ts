import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * Test that discussion board sections can be retrieved publicly without
 * authentication after moderator setup. A moderator creates a channel and
 * section, then an unauthenticated user retrieves the section details.
 * Validates public accessibility of section information and ensures proper data
 * visibility for anonymous users browsing discussion board content.
 */
export async function test_api_discussion_board_section_public_retrieval(
  connection: api.IConnection,
) {
  // 1. Moderator setup for administrative context
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: "securePassword123",
        display_name: RandomGenerator.name(2),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        moderation_level: "senior",
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create discussion board channel
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(8),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Create section within the channel
  const channelSummary: IDiscussionBoardChannel.ISummary = {
    id: channel.id,
    name: channel.name,
    description: channel.description,
    status: channel.status,
    created_at: channel.created_at,
  };

  const section: IDiscussionBoardSection =
    await api.functional.discussionBoard.moderator.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          channel: channelSummary,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Public retrieval without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const retrievedSection: IDiscussionBoardSection =
    await api.functional.discussionBoard.channels.sections.at(unauthConn, {
      channelName: channel.name,
      sectionName: section.name,
    });
  typia.assert(retrievedSection);

  // 5. Validate retrieved section matches created section
  TestValidator.equals(
    "section ID should match",
    retrievedSection.id,
    section.id,
  );
  TestValidator.equals(
    "section name should match",
    retrievedSection.name,
    section.name,
  );
  TestValidator.equals(
    "section description should match",
    retrievedSection.description,
    section.description,
  );
  TestValidator.equals(
    "section status should match",
    retrievedSection.status,
    section.status,
  );
  TestValidator.equals(
    "created_at timestamp should match",
    retrievedSection.created_at,
    section.created_at,
  );
}
