import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the complete workflow of a member creating a comment on an existing
 * article.
 *
 * This test validates that authenticated members can successfully post comments
 * on published articles. The test verifies:
 *
 * 1. A member can register and authenticate successfully
 * 2. The member can create an article to establish discussion context
 * 3. The member can post a comment on that article with valid content (1-2000
 *    characters)
 * 4. The created comment is properly associated with both the article and the
 *    member
 * 5. All system-managed fields (id, created_at, updated_at, member, article) are
 *    correctly populated
 * 6. The comment becomes immediately visible and accessible
 *
 * This validates the core discussion participation functionality of the
 * platform.
 */
export async function test_api_comment_creation_by_authenticated_member(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "securePassword123";
  const memberUsername = RandomGenerator.name(2);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create an article to serve as the target for comment posting
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: articleTitle,
        body: articleBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Post a comment on the created article
  const commentContent = RandomGenerator.paragraph({
    sentences: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<30>
    >(),
    wordMin: 4,
    wordMax: 10,
  });

  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: commentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 4: Validate that the comment content matches what was posted
  TestValidator.equals(
    "comment content matches input",
    comment.content,
    commentContent,
  );

  // Step 5: Verify the comment is associated with the correct article
  TestValidator.equals(
    "comment article ID matches",
    comment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment article title matches",
    comment.article.title,
    article.title,
  );

  // Step 6: Verify the comment is associated with the correct member
  TestValidator.equals(
    "comment member ID matches",
    comment.member_id,
    member.id,
  );
  TestValidator.equals(
    "comment member username matches",
    comment.member.username,
    member.username,
  );
  TestValidator.equals(
    "comment member email matches",
    comment.member.email,
    member.email,
  );

  // Step 7: Verify deleted_at is null for newly created comment
  TestValidator.predicate(
    "comment is not deleted",
    comment.deleted_at === null || comment.deleted_at === undefined,
  );
}
