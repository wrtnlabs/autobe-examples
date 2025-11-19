import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostLike } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostLike";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * Test the complete workflow of a member liking a discussion board post.
 *
 * This E2E test validates that an authenticated member can create a like record
 * for a post they have access to, and verifies that duplicate likes are
 * prevented by the system's unique constraint validation. The test includes
 * creating a new member account, setting up discussion board infrastructure
 * (channel and section), creating a post, and successfully creating a like
 * record for that post.
 */
export async function test_api_post_like_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "password123",
        href: "https://example.com/discussion-board",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create and authenticate a moderator account for content setup
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "moderator123",
        moderation_level: "admin",
        href: "https://example.com/admin",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Create a discussion board channel
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Step 4: Create a section within the channel
  const section: IDiscussionBoardSection =
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

  // Step 5: Switch back to member authentication
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      href: "https://example.com/discussion-board",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Step 6: Create a discussion board post
  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_channel_id: channel.id,
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardPost.ICreate,
    });
  typia.assert(post);

  // Step 7: Create a like record for the post
  const like: IDiscussionBoardPostLike =
    await api.functional.discussionBoard.member.posts.likes.create(connection, {
      postId: post.id,
      body: {
        member_id: member.id,
      } satisfies IDiscussionBoardPostLike.ICreate,
    });
  typia.assert(like);

  // Step 8: Validate the like record properties
  TestValidator.equals(
    "like member ID matches authenticated member",
    like.member.id,
    member.id,
  );
  TestValidator.equals(
    "like post ID matches created post",
    like.post.id,
    post.id,
  );
  TestValidator.predicate(
    "like has creation timestamp",
    like.created_at !== undefined,
  );

  // Step 9: Verify duplicate like prevention
  await TestValidator.error("duplicate like should fail", async () => {
    await api.functional.discussionBoard.member.posts.likes.create(connection, {
      postId: post.id,
      body: {
        member_id: member.id,
      } satisfies IDiscussionBoardPostLike.ICreate,
    });
  });
}
