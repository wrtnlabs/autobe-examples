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
 * Test that a member can successfully delete their own discussion board post.
 *
 * This test validates the complete deletion workflow including authentication,
 * post creation, and permanent removal. The test verifies that the deletion
 * operation returns the deleted post information and that subsequent attempts
 * to access the deleted post fail appropriately.
 */
export async function test_api_post_deletion_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for administrative setup
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(10),
      password: moderatorPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      moderation_level: "admin",
      ip: "127.0.0.1",
      href: "https://discussion-board.example.com/register",
      referrer: "https://discussion-board.example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create discussion board channel
  const channel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create section within the channel
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

  // Step 4: Switch to member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      ip: "127.0.0.1",
      href: "https://discussion-board.example.com/register",
      referrer: "https://discussion-board.example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 5: Create discussion board post
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const postContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const post = await api.functional.discussionBoard.member.posts.create(
    connection,
    {
      body: {
        title: postTitle,
        content: postContent,
        discussion_board_channel_id: channel.id,
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Delete the post
  const deletedPost = await api.functional.discussionBoard.member.posts.erase(
    connection,
    {
      postId: post.id,
    },
  );
  typia.assert(deletedPost);

  // Validate that the deleted post matches the original post
  TestValidator.equals(
    "deleted post ID matches original",
    deletedPost.id,
    post.id,
  );
  TestValidator.equals(
    "deleted post title matches original",
    deletedPost.title,
    post.title,
  );
  TestValidator.equals(
    "deleted post content matches original",
    deletedPost.content,
    post.content,
  );

  // Step 7: Verify post is permanently deleted by attempting to delete again
  await TestValidator.error("cannot delete already deleted post", async () => {
    await api.functional.discussionBoard.member.posts.erase(connection, {
      postId: post.id,
    });
  });
}
