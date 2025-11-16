import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test realistic discussion scenario with multiple members posting comments.
 *
 * This test validates the core collaborative discussion functionality by
 * simulating multiple independent members participating in a discussion on the
 * same article. It ensures proper comment attribution, multi-user interaction
 * support, and data integrity across the discussion board platform.
 *
 * Test workflow:
 *
 * 1. Register three distinct member accounts with unique credentials
 * 2. First member creates a discussion article
 * 3. Each member posts a unique comment on the article
 * 4. Validate each comment is correctly attributed to its author
 * 5. Verify complete discussion integrity with all comments properly stored
 */
export async function test_api_comment_multiple_members_discussion(
  connection: api.IConnection,
) {
  // Step 1: Register first member who will create the article
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password: "SecurePass123!",
        username: RandomGenerator.name(2),
        ip: "192.168.1.100",
        href: "https://discussion.example.com/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://discussion.example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member1);

  // Step 2: First member creates a discussion article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 4,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.equals(
    "article author is member1",
    article.author.id,
    member1.id,
  );

  // Step 3: Register second member
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password: "SecurePass456!",
        username: RandomGenerator.name(2),
        ip: "192.168.1.101",
        href: "https://discussion.example.com/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://discussion.example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member2);

  // Step 4: Register third member
  const member3Email = typia.random<string & tags.Format<"email">>();
  const member3: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member3Email,
        password: "SecurePass789!",
        username: RandomGenerator.name(2),
        ip: "192.168.1.102",
        href: "https://discussion.example.com/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://discussion.example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member3);

  // Step 5: Member 1 posts first comment on the article
  const comment1: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 10,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment1);
  TestValidator.equals(
    "comment1 attributed to member1",
    comment1.member.id,
    member1.id,
  );
  TestValidator.equals(
    "comment1 belongs to article",
    comment1.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment1 member_id matches member1",
    comment1.member_id,
    member1.id,
  );

  // Step 6: Member 2 posts second comment on the article
  const comment2: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 12,
            wordMin: 3,
            wordMax: 7,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment2);
  TestValidator.equals(
    "comment2 attributed to member2",
    comment2.member.id,
    member2.id,
  );
  TestValidator.equals(
    "comment2 belongs to article",
    comment2.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment2 member_id matches member2",
    comment2.member_id,
    member2.id,
  );

  // Step 7: Member 3 posts third comment on the article
  const comment3: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 8,
            wordMin: 5,
            wordMax: 9,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment3);
  TestValidator.equals(
    "comment3 attributed to member3",
    comment3.member.id,
    member3.id,
  );
  TestValidator.equals(
    "comment3 belongs to article",
    comment3.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment3 member_id matches member3",
    comment3.member_id,
    member3.id,
  );

  // Step 8: Verify all three comments have different authors
  TestValidator.notEquals(
    "comment1 and comment2 have different authors",
    comment1.member.id,
    comment2.member.id,
  );
  TestValidator.notEquals(
    "comment1 and comment3 have different authors",
    comment1.member.id,
    comment3.member.id,
  );
  TestValidator.notEquals(
    "comment2 and comment3 have different authors",
    comment2.member.id,
    comment3.member.id,
  );

  // Step 9: Verify all comments are associated with the same article
  TestValidator.equals(
    "all comments belong to same article",
    comment1.discussion_board_article_id,
    comment2.discussion_board_article_id,
  );
  TestValidator.equals(
    "all comments belong to same article",
    comment2.discussion_board_article_id,
    comment3.discussion_board_article_id,
  );

  // Step 10: Verify article summary information is consistent in all comments
  TestValidator.equals(
    "comment1 article summary title matches",
    comment1.article.title,
    article.title,
  );
  TestValidator.equals(
    "comment2 article summary title matches",
    comment2.article.title,
    article.title,
  );
  TestValidator.equals(
    "comment3 article summary title matches",
    comment3.article.title,
    article.title,
  );
}
