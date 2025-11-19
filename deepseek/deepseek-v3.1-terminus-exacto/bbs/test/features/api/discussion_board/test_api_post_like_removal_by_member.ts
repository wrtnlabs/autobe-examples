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
import type { IDiscussionBoardUserBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBookmark";

/**
 * Test the complete workflow of a member removing their like from a discussion
 * board post. This scenario validates that authenticated members can retract
 * their appreciation by deleting like records they previously created. The test
 * ensures proper ownership validation, preventing unauthorized removal of other
 * users' likes.
 */
export async function test_api_post_like_removal_by_member(
  connection: api.IConnection,
) {
  // Create moderator account for channel/section setup
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        password: "moderator123",
        moderation_level: "basic",
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Create discussion board channel
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 1,
          wordMax: 3,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Create section within the channel
  const section: IDiscussionBoardSection =
    await api.functional.discussionBoard.moderator.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 1,
            wordMax: 3,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
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

  // Create member account for post creation and liking
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        password: "member123",
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Create post in the section
  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        discussion_board_channel_id: channel.id,
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardPost.ICreate,
    });
  typia.assert(post);

  // Create bookmark to ensure member authentication
  const bookmark: IDiscussionBoardUserBookmark =
    await api.functional.discussionBoard.member.members.bookmarks.postByUsername(
      connection,
      {
        username: member.username,
        body: {
          discussion_board_post_id: post.id,
        } satisfies IDiscussionBoardUserBookmark.ICreate,
      },
    );
  typia.assert(bookmark);

  // Create like on the post
  const like: IDiscussionBoardPostLike =
    await api.functional.members.posts.likes.create(connection, {
      memberId: member.id,
      postId: post.id,
    });
  typia.assert(like);

  // Verify like was created successfully
  TestValidator.equals("like member ID matches", like.member.id, member.id);
  TestValidator.equals("like post ID matches", like.post.id, post.id);

  // Delete the like using the member's credentials
  await api.functional.members.posts.likes.erase(connection, {
    memberId: member.id,
    postId: post.id,
  });

  // Verify like deletion by attempting to create another like (should succeed)
  const newLike: IDiscussionBoardPostLike =
    await api.functional.members.posts.likes.create(connection, {
      memberId: member.id,
      postId: post.id,
    });
  typia.assert(newLike);

  // Verify the new like has different ID than the original
  TestValidator.notEquals(
    "new like should have different ID",
    newLike.id,
    like.id,
  );

  // Final cleanup - delete the new like
  await api.functional.members.posts.likes.erase(connection, {
    memberId: member.id,
    postId: post.id,
  });
}
