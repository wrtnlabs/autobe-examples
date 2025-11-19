import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * Test that moderators can create multiple sections within the same channel
 * with different names and descriptions.
 */
export async function test_api_discussion_board_section_creation_multiple_sections(
  connection: api.IConnection,
) {
  // 1. Create moderator authentication context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.name(1),
      password: "testPassword123",
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      bio: RandomGenerator.content({ paragraphs: 1 }),
      moderation_level: "senior",
      ip: "192.168.1.1",
      href: "https://example.com/discussion",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create parent discussion board channel for organization
  const channel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Create multiple sections within the channel with unique names and descriptions
  const sectionCount = 3;
  const createdSections: IDiscussionBoardSection[] = [];

  for (let i = 0; i < sectionCount; i++) {
    const section =
      await api.functional.discussionBoard.moderator.channels.sections.create(
        connection,
        {
          channelName: channel.name,
          body: {
            name: `Section ${i + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
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
    createdSections.push(section);
  }

  // 4. Validate each section is properly created and accessible
  createdSections.forEach((section, index) => {
    TestValidator.equals(
      `section ${index + 1} should have non-empty ID`,
      section.id.length > 0,
      true,
    );
    TestValidator.equals(
      `section ${index + 1} should have non-empty name`,
      section.name.length > 0,
      true,
    );
    TestValidator.equals(
      `section ${index + 1} should have non-empty description`,
      section.description.length > 0,
      true,
    );
    TestValidator.equals(
      `section ${index + 1} should have active status`,
      section.status,
      "active",
    );
    TestValidator.predicate(
      `section ${index + 1} should have valid creation timestamp`,
      new Date(section.created_at).getTime() > 0,
    );
  });

  // 5. Verify section count and organizational structure
  TestValidator.equals(
    "should create exactly 3 sections",
    createdSections.length,
    sectionCount,
  );

  // Verify all sections have unique names
  const sectionNames = createdSections.map((s) => s.name);
  const uniqueNames = new Set(sectionNames);
  TestValidator.equals(
    "all section names should be unique",
    uniqueNames.size,
    sectionCount,
  );

  // Verify all sections have valid UUID format for IDs
  createdSections.forEach((section, index) => {
    TestValidator.predicate(
      `section ${index + 1} should have valid UUID format ID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        section.id,
      ),
    );
  });
}
