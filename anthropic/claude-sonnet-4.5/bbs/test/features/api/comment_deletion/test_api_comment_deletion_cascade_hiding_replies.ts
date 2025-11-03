import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test the cascade hiding behavior when a moderator deletes a top-level comment
 * that has replies.
 *
 * This test validates that when a parent comment is soft-deleted, all its
 * nested replies are also hidden from public view to maintain thread coherence.
 * The test creates a top-level comment and several replies to it, then has a
 * moderator delete the parent comment. It verifies that both the parent comment
 * and all its replies are hidden from public comment listings, while the
 * database records are preserved with deleted_at timestamps.
 *
 * Test Steps:
 *
 * 1. Create moderator account for performing comment deletion
 * 2. Create member account for creating article and comments
 * 3. Create category required for article creation
 * 4. Create article to host the comment thread
 * 5. Create top-level comment that will be deleted
 * 6. Create multiple reply comments to the top-level comment
 * 7. Moderator deletes the parent comment
 * 8. Verify parent comment has deleted_at timestamp set
 * 9. Verify deletion maintains single-level threading integrity
 */
export async function test_api_comment_deletion_cascade_hiding_replies(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: `moderator_${RandomGenerator.alphaNumeric(6)}@test.com`,
        password: "SecurePass123!",
        href: "https://test.example.com/moderator/join",
        referrer: "https://test.example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account for creating article and comments
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: `member_${RandomGenerator.alphaNumeric(6)}@test.com`,
        password: "MemberPass123!",
        href: "https://test.example.com/member/join",
        referrer: "https://test.example.com",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // Step 3: Create category (moderator is already authenticated)
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: `Category ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create article (member is already authenticated from join)
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Create top-level comment
  const topLevelComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.create(connection, {
      articleId: article.id,
      body: {
        discussion_board_article_id: article.id,
        discussion_board_parent_comment_id: null,
        content: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IDiscussionBoardComment.ICreate,
    });
  typia.assert(topLevelComment);

  TestValidator.predicate(
    "top-level comment should not have deleted_at initially",
    topLevelComment.deleted_at === null,
  );

  // Step 6: Create multiple reply comments to the top-level comment
  const replyCount = 3;
  const replies: IDiscussionBoardComment[] = await ArrayUtil.asyncRepeat(
    replyCount,
    async (index) => {
      const reply: IDiscussionBoardComment =
        await api.functional.discussionBoard.articles.comments.create(
          connection,
          {
            articleId: article.id,
            body: {
              discussion_board_article_id: article.id,
              discussion_board_parent_comment_id: topLevelComment.id,
              content: `Reply ${index + 1}: ${RandomGenerator.paragraph({ sentences: 5 })}`,
            } satisfies IDiscussionBoardComment.ICreate,
          },
        );
      typia.assert(reply);

      TestValidator.predicate(
        `reply ${index + 1} should not have deleted_at initially`,
        reply.deleted_at === null,
      );

      TestValidator.equals(
        `reply ${index + 1} should reference parent comment`,
        reply.discussion_board_parent_comment_id,
        topLevelComment.id,
      );

      return reply;
    },
  );

  TestValidator.equals(
    "should have created expected number of replies",
    replies.length,
    replyCount,
  );

  // Step 7: Moderator deletes the parent comment
  const deletedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.moderator.articles.comments.erase(
      connection,
      {
        articleId: article.id,
        commentId: topLevelComment.id,
      },
    );
  typia.assert(deletedComment);

  // Step 8: Verify parent comment has deleted_at timestamp set
  TestValidator.predicate(
    "parent comment should have deleted_at timestamp after deletion",
    deletedComment.deleted_at !== null,
  );

  TestValidator.equals(
    "deleted comment ID should match original top-level comment",
    deletedComment.id,
    topLevelComment.id,
  );

  // Step 9: Verify deletion maintains single-level threading integrity
  TestValidator.equals(
    "deleted comment should maintain parent reference as null",
    deletedComment.discussion_board_parent_comment_id,
    null,
  );

  TestValidator.equals(
    "deleted comment should maintain article reference",
    deletedComment.discussion_board_article_id,
    article.id,
  );

  TestValidator.predicate(
    "deleted comment should preserve content",
    deletedComment.content.length > 0,
  );
}
