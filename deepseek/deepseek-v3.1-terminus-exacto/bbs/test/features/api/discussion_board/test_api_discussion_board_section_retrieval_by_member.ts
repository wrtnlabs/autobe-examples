import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * Test that discussion board sections can be retrieved by members after proper
 * channel and section creation.
 *
 * This E2E test validates the complete workflow of discussion board section
 * retrieval:
 *
 * 1. Moderator authentication and channel creation
 * 2. Section creation within the channel
 * 3. Member authentication
 * 4. Section retrieval by authenticated member
 *
 * The test ensures proper authentication flow, data integrity, and that section
 * information including name, description, status, and timestamps are correctly
 * returned.
 */
export async function test_api_discussion_board_section_retrieval_by_member(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to create channel and section
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: "moderator123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        moderation_level: "admin",
        ip: "192.168.1.1",
        href: "https://example.com/discussion-board",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create discussion board channel
  const channelName = RandomGenerator.name(1);
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: channelName,
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create section within the channel
  const sectionName = RandomGenerator.name(1);
  const section: IDiscussionBoardSection =
    await api.functional.discussionBoard.moderator.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: sectionName,
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

  // Step 4: Authenticate as member to test section retrieval
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "member123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        ip: "192.168.1.2",
        href: "https://example.com/discussion-board",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 5: Retrieve section details as authenticated member
  const retrievedSection: IDiscussionBoardSection =
    await api.functional.discussionBoard.channels.sections.at(connection, {
      channelName: channel.name,
      sectionName: section.name,
    });
  typia.assert(retrievedSection);

  // Validate that retrieved section matches created section
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
    "created timestamp should match",
    retrievedSection.created_at,
    section.created_at,
  );
}
