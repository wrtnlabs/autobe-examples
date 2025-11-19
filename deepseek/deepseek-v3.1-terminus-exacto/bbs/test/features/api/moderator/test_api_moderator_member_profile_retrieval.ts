import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * Test that moderators can retrieve detailed member profile information by
 * username. This scenario validates that authorized moderators can access
 * comprehensive member data including identification and account status for
 * moderation purposes.
 */
export async function test_api_moderator_member_profile_retrieval(
  connection: api.IConnection,
) {
  // Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: "test123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        moderation_level: "basic",
        ip: "192.168.1.1",
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.name(1);
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: "test123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        ip: "192.168.1.2",
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Create channel as moderator
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.name(1),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Create section within channel
  const section: IDiscussionBoardSection =
    await api.functional.discussionBoard.moderator.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // Switch to member account and create post
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "test123",
      href: "https://example.com",
      referrer: "https://example.com/referrer",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        discussion_board_channel_id: channel.id,
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardPost.ICreate,
    });
  typia.assert(post);

  // Switch back to moderator account
  await api.functional.auth.moderator.login(connection, {
    body: {
      email_or_username: moderatorEmail,
      password: "test123",
      href: "https://example.com",
      referrer: "https://example.com/referrer",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Retrieve member profile as moderator
  const retrievedMember: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.at(connection, {
      username: memberUsername,
    });
  typia.assert(retrievedMember);

  // Validate retrieved member data
  TestValidator.equals(
    "retrieved member ID matches created member",
    retrievedMember.id,
    member.id,
  );
  TestValidator.equals(
    "retrieved member name matches username",
    retrievedMember.name,
    memberUsername,
  );
  TestValidator.equals(
    "retrieved member type is correct",
    retrievedMember.type,
    "member",
  );
  TestValidator.predicate(
    "retrieved member has valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedMember.id,
    ),
  );
}
