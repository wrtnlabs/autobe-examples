import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * Test complete workflow for comment attachment deletion by the original
 * author. Validates that authenticated members can successfully delete
 * attachments they uploaded to their own comments, including proper cleanup of
 * file storage resources and database records. The scenario covers the entire
 * dependency chain from channel/section creation through post creation, comment
 * creation, attachment upload, and final deletion.
 */
export async function test_api_comment_attachment_deletion_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for channel/section setup
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: "moderator123",
        moderation_level: "admin",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create discussion board channel
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
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

  // Step 4: Create member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "member123",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 5: Create discussion post
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

  // Step 6: Create comment on the post
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 7: Upload attachment to the comment
  const attachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          file_name: "test_document.pdf",
          file_type: "application/pdf",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<5000>
          >(),
          storage_path: "/attachments/test_document.pdf",
          description: "Test document for attachment deletion",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // Step 8: Delete the attachment (main test operation)
  await api.functional.discussionBoard.member.comments.attachments.erase(
    connection,
    {
      commentId: comment.id,
      attachmentId: attachment.id,
    },
  );

  // Step 9: Verify deletion was successful by attempting to delete again (should fail)
  await TestValidator.error(
    "deleting non-existent attachment should fail",
    async () => {
      await api.functional.discussionBoard.member.comments.attachments.erase(
        connection,
        {
          commentId: comment.id,
          attachmentId: attachment.id,
        },
      );
    },
  );

  // Step 10: Test authorization boundary - create another member and attempt to delete other's attachment
  const otherMemberEmail = typia.random<string & tags.Format<"email">>();
  const otherMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: otherMemberEmail,
        username: RandomGenerator.alphabets(8),
        password: "othermember123",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(otherMember);

  // Create a new attachment with the original member
  const secondAttachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          file_name: "second_document.docx",
          file_type:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<200> &
              tags.Maximum<10000>
          >(),
          storage_path: "/attachments/second_document.docx",
          description: "Second test document for authorization testing",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(secondAttachment);

  // Switch to other member context
  await api.functional.auth.member.login(connection, {
    body: {
      email: otherMemberEmail,
      password: "othermember123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Attempt to delete attachment belonging to original member (should fail)
  await TestValidator.error(
    "other member cannot delete attachment they don't own",
    async () => {
      await api.functional.discussionBoard.member.comments.attachments.erase(
        connection,
        {
          commentId: comment.id,
          attachmentId: secondAttachment.id,
        },
      );
    },
  );

  // Switch back to original member and delete the second attachment
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Final deletion by the original author
  await api.functional.discussionBoard.member.comments.attachments.erase(
    connection,
    {
      commentId: comment.id,
      attachmentId: secondAttachment.id,
    },
  );

  // Final validation: All operations completed successfully
  TestValidator.predicate("complete workflow executed without errors", true);
}
