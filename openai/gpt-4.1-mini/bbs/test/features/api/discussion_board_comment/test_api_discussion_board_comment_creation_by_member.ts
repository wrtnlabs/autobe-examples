import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardMember";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test: Create a discussion board comment by an authenticated member
 * referencing an existing article.
 *
 * Workflow:
 *
 * 1. Register a new member using /auth/member/join
 * 2. Register a discussion board article using
 *    /discussionBoard/member/discussionBoardArticles
 * 3. Create a comment referencing the article using
 *    /discussionBoard/member/discussionBoardComments
 *
 * Assertions:
 *
 * - Validate types with typia.assert()
 * - Validate returned comment contains correct content, references article's ID
 *   and author info
 * - Proper authorization and member linkage
 */
export async function test_api_discussion_board_comment_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Register a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "securePassword123";
  const memberNickname = RandomGenerator.name();

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        nickname: memberNickname,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a discussion board article
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleContent = RandomGenerator.content({ paragraphs: 2 });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 3. Create a comment referencing the article
  const commentContent = RandomGenerator.paragraph({ sentences: 2 });
  // Use realistic URLs with https scheme
  const href = `https://example.com/article/${article.id}`;
  const referrer = `https://example.com/discussion`;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.discussionBoardComments.create(
      connection,
      {
        body: {
          content: commentContent,
          discussion_board_article_id: article.id,
          href: href,
          referrer: referrer,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Validate comment content
  TestValidator.equals(
    "comment content matches",
    comment.content,
    commentContent,
  );
  // Validate article ID matches
  TestValidator.equals(
    "comment references correct article",
    comment.discussion_board_article_id,
    article.id,
  );
  // Validate comment author id matches the member id
  TestValidator.equals(
    "comment author id matches member id",
    comment.author.id,
    member.id,
  );
}
