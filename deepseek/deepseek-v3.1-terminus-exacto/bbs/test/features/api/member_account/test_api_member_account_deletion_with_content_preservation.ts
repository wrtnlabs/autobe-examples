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
 * Test member account deletion workflow that validates soft deletion preserves
 * content relationships while removing account access. Creates comprehensive
 * member participation including posts, then verifies that deletion maintains
 * referential integrity for audit purposes while preventing further account
 * access. Validates that deleted_at timestamp is set while content
 * relationships remain intact for historical reference.
 */
export async function test_api_member_account_deletion_with_content_preservation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account to set up discussion board structure
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        moderation_level: "admin",
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create channel for content organization
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.name(1),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create section within the channel
  const section: IDiscussionBoardSection =
    await api.functional.discussionBoard.moderator.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
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

  // Step 4: Create member account with authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member123";
  const memberUsername = RandomGenerator.name(1);

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 5: Create member posts to establish content relationships
  const postData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    discussion_board_channel_id: channel.id,
    discussion_board_section_id: section.id,
  } satisfies IDiscussionBoardPost.ICreate;

  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 6: Perform member account deletion (soft delete)
  const deletedMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.members.erase(connection, {
      username: memberUsername,
    });
  typia.assert(deletedMember);

  // Step 7: Verify deleted_at timestamp is set
  TestValidator.predicate(
    "deleted_at timestamp should be set after soft deletion",
    deletedMember.deleted_at !== undefined && deletedMember.deleted_at !== null,
  );

  // Step 8: Validate that content relationships are preserved
  TestValidator.equals(
    "member ID should remain unchanged after deletion",
    deletedMember.id,
    member.id,
  );

  TestValidator.equals(
    "member email should remain unchanged after deletion",
    deletedMember.email,
    member.email,
  );

  TestValidator.equals(
    "member username should remain unchanged after deletion",
    deletedMember.username,
    member.username,
  );

  // Step 9: Test that deleted account cannot authenticate
  await TestValidator.error(
    "deleted member should not be able to authenticate",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: memberEmail,
          password: memberPassword,
          href: "https://example.com",
          referrer: "https://example.com/referrer",
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );

  // Step 10: Verify post content remains accessible (content preservation)
  TestValidator.equals(
    "post title should match original content",
    post.title,
    postData.title,
  );

  TestValidator.equals(
    "post content should match original content",
    post.content,
    postData.content,
  );

  TestValidator.equals(
    "post channel ID should match original channel",
    post.channel.id,
    channel.id,
  );

  TestValidator.equals(
    "post section ID should match original section",
    post.section.id,
    section.id,
  );
}
