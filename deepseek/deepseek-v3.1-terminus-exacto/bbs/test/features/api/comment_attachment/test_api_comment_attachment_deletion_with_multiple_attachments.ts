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
 * Test attachment deletion when multiple attachments exist on the same comment.
 * Validates that deleting one attachment does not affect other attachments on
 * the same comment and that the system properly maintains attachment references
 * and cleanup processes. Tests proper isolation between attachment records and
 * their parent comment relationships.
 */
export async function test_api_comment_attachment_deletion_with_multiple_attachments(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://example.com",
      referrer: "https://example.com/register",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create moderator account for channel/section creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      moderation_level: "admin",
      href: "https://example.com",
      referrer: "https://example.com/register",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Create discussion channel
  const channel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Step 4: Create section within channel
  const section =
    await api.functional.discussionBoard.moderator.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // Step 5: Create discussion post
  const post = await api.functional.discussionBoard.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_channel_id: channel.id,
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Create comment on the post
  const comment =
    await api.functional.discussionBoard.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 7: Upload multiple attachments to the same comment
  const attachment1 =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          file_name: "document1.pdf",
          file_type: "application/pdf",
          file_size: 1024,
          storage_path: "/attachments/doc1.pdf",
          description: "First test document",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment1);

  const attachment2 =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          file_name: "image1.jpg",
          file_type: "image/jpeg",
          file_size: 2048,
          storage_path: "/attachments/img1.jpg",
          description: "First test image",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment2);

  const attachment3 =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          file_name: "data1.txt",
          file_type: "text/plain",
          file_size: 512,
          storage_path: "/attachments/data1.txt",
          description: "First test data file",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment3);

  // Validate all attachments were created successfully with correct comment references
  TestValidator.equals(
    "attachment1 comment reference",
    attachment1.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "attachment2 comment reference",
    attachment2.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "attachment3 comment reference",
    attachment3.comment.id,
    comment.id,
  );

  // Store original attachment properties for later comparison
  const originalAttachment1Props = {
    file_name: attachment1.file_name,
    file_type: attachment1.file_type,
    file_size: attachment1.file_size,
    storage_path: attachment1.storage_path,
    description: attachment1.description,
  };

  const originalAttachment3Props = {
    file_name: attachment3.file_name,
    file_type: attachment3.file_type,
    file_size: attachment3.file_size,
    storage_path: attachment3.storage_path,
    description: attachment3.description,
  };

  // Step 8: Delete one attachment (attachment2)
  await api.functional.discussionBoard.member.comments.attachments.erase(
    connection,
    {
      commentId: comment.id,
      attachmentId: attachment2.id,
    },
  );

  // Step 9: Verify that the deleted attachment cannot be accessed again
  await TestValidator.error(
    "deleted attachment should not be accessible",
    async () => {
      await api.functional.discussionBoard.member.comments.attachments.erase(
        connection,
        {
          commentId: comment.id,
          attachmentId: attachment2.id,
        },
      );
    },
  );

  // Step 10: Comprehensive validation of attachment isolation

  // Verify remaining attachments are still intact and unchanged
  TestValidator.equals(
    "attachment1 file name unchanged",
    attachment1.file_name,
    originalAttachment1Props.file_name,
  );
  TestValidator.equals(
    "attachment1 file type unchanged",
    attachment1.file_type,
    originalAttachment1Props.file_type,
  );
  TestValidator.equals(
    "attachment1 file size unchanged",
    attachment1.file_size,
    originalAttachment1Props.file_size,
  );
  TestValidator.equals(
    "attachment1 storage path unchanged",
    attachment1.storage_path,
    originalAttachment1Props.storage_path,
  );
  TestValidator.equals(
    "attachment1 description unchanged",
    attachment1.description,
    originalAttachment1Props.description,
  );

  TestValidator.equals(
    "attachment3 file name unchanged",
    attachment3.file_name,
    originalAttachment3Props.file_name,
  );
  TestValidator.equals(
    "attachment3 file type unchanged",
    attachment3.file_type,
    originalAttachment3Props.file_type,
  );
  TestValidator.equals(
    "attachment3 file size unchanged",
    attachment3.file_size,
    originalAttachment3Props.file_size,
  );
  TestValidator.equals(
    "attachment3 storage path unchanged",
    attachment3.storage_path,
    originalAttachment3Props.storage_path,
  );
  TestValidator.equals(
    "attachment3 description unchanged",
    attachment3.description,
    originalAttachment3Props.description,
  );

  // Validate comment references remain intact
  TestValidator.equals(
    "attachment1 comment reference remains",
    attachment1.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "attachment3 comment reference remains",
    attachment3.comment.id,
    comment.id,
  );

  // Final validation: Ensure complete isolation between attachment records
  TestValidator.predicate(
    "attachments have distinct IDs",
    attachment1.id !== attachment2.id &&
      attachment1.id !== attachment3.id &&
      attachment2.id !== attachment3.id,
  );

  TestValidator.predicate(
    "deleted attachment ID differs from remaining",
    attachment1.id !== attachment2.id && attachment3.id !== attachment2.id,
  );

  // Validate that the system properly maintains attachment isolation
  TestValidator.predicate(
    "attachment deletion maintains complete isolation",
    attachment1.id !== attachment2.id &&
      attachment3.id !== attachment2.id &&
      attachment1.file_name === "document1.pdf" &&
      attachment3.file_name === "data1.txt",
  );
}
