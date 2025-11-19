import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the process of a member updating their own discussion board article.
 *
 * This test performs the following steps:
 *
 * 1. Registers a new discussion board member.
 * 2. Creates a new article authored by this member.
 * 3. Updates the article's title and content.
 * 4. Verifies the updated article data matches the input.
 *
 * The test ensures that only authenticated authors can perform updates and that
 * the system properly updates and returns the modified article data.
 */
export async function test_api_discussion_board_article_update_by_author(
  connection: api.IConnection,
) {
  // 1. Register a new discussion board member
  const memberCreateBody = {
    email: `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@example.com`,
    password: "secret1234",
    nickname: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Create a new article authored by this member
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 7 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // Validate returned article has correct author
  TestValidator.equals(
    "article author id matches",
    article.discussion_board_member_id,
    member.id,
  );

  // 3. Update the article's title and content
  const articleUpdateBody = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({
      paragraphs: 4,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 5,
      wordMax: 12,
    }),
  } satisfies IDiscussionBoardArticle.IUpdate;

  const updatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.update(
      connection,
      {
        id: article.id,
        body: articleUpdateBody,
      },
    );
  typia.assert(updatedArticle);

  // Validate updated article fields
  TestValidator.equals(
    "updated article id remains same",
    updatedArticle.id,
    article.id,
  );
  TestValidator.equals(
    "updated article author remains same",
    updatedArticle.discussion_board_member_id,
    article.discussion_board_member_id,
  );
  TestValidator.equals(
    "updated article title matches",
    updatedArticle.title,
    articleUpdateBody.title,
  );
  TestValidator.equals(
    "updated article content matches",
    updatedArticle.content,
    articleUpdateBody.content,
  );
}
