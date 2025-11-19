import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * Test comment content validation during update operation, ensuring that
 * content length constraints (1-2000 characters) are properly enforced.
 * Validates that empty content, overly long content, and properly formatted
 * content are handled correctly according to business rules. The scenario tests
 * boundary conditions and content moderation requirements.
 *
 * This test focuses specifically on the comment content validation rules
 * without requiring complex channel and section setup. It assumes a valid post
 * context exists for comment operations.
 */
export async function test_api_comment_update_content_validation(
  connection: api.IConnection,
) {
  // 1. Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.name(1),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://example.com/discussion",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a post using realistic but fictional data (assumes valid setup)
  // Note: In a real implementation, valid channel and section IDs would be needed
  const post = await api.functional.discussionBoard.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_channel_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. Create an initial comment to update
  const initialComment =
    await api.functional.discussionBoard.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(initialComment);

  // 4. Test valid content update (within 1-2000 characters)
  const validUpdateContent = RandomGenerator.paragraph({ sentences: 5 });
  const updatedComment =
    await api.functional.discussionBoard.member.comments.update(connection, {
      commentId: initialComment.id,
      body: {
        content: validUpdateContent,
      } satisfies IDiscussionBoardComment.IUpdate,
    });
  typia.assert(updatedComment);
  TestValidator.equals(
    "comment content should be updated with valid content",
    updatedComment.content,
    validUpdateContent,
  );

  // 5. Test empty content update (should fail)
  await TestValidator.error(
    "empty content should fail validation",
    async () => {
      await api.functional.discussionBoard.member.comments.update(connection, {
        commentId: initialComment.id,
        body: {
          content: "",
        } satisfies IDiscussionBoardComment.IUpdate,
      });
    },
  );

  // 6. Test content exceeding maximum length (2000 characters)
  const overlyLongContent = RandomGenerator.content({ paragraphs: 10 });
  await TestValidator.error(
    "content exceeding 2000 characters should fail validation",
    async () => {
      await api.functional.discussionBoard.member.comments.update(connection, {
        commentId: initialComment.id,
        body: {
          content: overlyLongContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      });
    },
  );

  // 7. Test minimal valid content (1 character)
  const minimalContent = "A";
  const minimalUpdate =
    await api.functional.discussionBoard.member.comments.update(connection, {
      commentId: initialComment.id,
      body: {
        content: minimalContent,
      } satisfies IDiscussionBoardComment.IUpdate,
    });
  typia.assert(minimalUpdate);
  TestValidator.equals(
    "minimal content (1 character) should be accepted",
    minimalUpdate.content,
    minimalContent,
  );

  // 8. Test maximum valid content (2000 characters)
  const maxLengthContent = RandomGenerator.alphabets(2000);
  const maxLengthUpdate =
    await api.functional.discussionBoard.member.comments.update(connection, {
      commentId: initialComment.id,
      body: {
        content: maxLengthContent,
      } satisfies IDiscussionBoardComment.IUpdate,
    });
  typia.assert(maxLengthUpdate);
  TestValidator.equals(
    "maximum content (2000 characters) should be accepted",
    maxLengthUpdate.content,
    maxLengthContent,
  );
}
