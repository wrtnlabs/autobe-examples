import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_article_detail_public_access(
  connection: api.IConnection,
) {
  // 1. Register a new discussion board member account (join operation)
  const memberJoinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "Password123!",
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberJoinBody });
  typia.assert(member);

  // 2. Create a new discussion board article as the authenticated member
  const attachment1 = {
    filename: "image1.png",
    file_type: "image/png",
    file_url: "https://example.com/image1.png",
  };
  const attachment2 = {
    filename: "document1.pdf",
    file_type: "application/pdf",
    file_url: "https://example.com/document1.pdf",
  };
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    content_markdown: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    discussion_board_attachments: [attachment1, attachment2],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      { body: articleCreateBody },
    );
  typia.assert(article);
  TestValidator.predicate(
    "article created has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      article.id,
    ),
  );

  // 3. Retrieve the article publicly by articleId (no authentication assumed in this operation)
  const retrievedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.discussionBoardArticles.at(
      connection,
      { articleId: article.id },
    );
  typia.assert(retrievedArticle);

  TestValidator.equals(
    "retrieved article ID matches",
    retrievedArticle.id,
    article.id,
  );
  TestValidator.equals(
    "retrieved article title matches",
    retrievedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "retrieved article content matches",
    retrievedArticle.content_markdown,
    article.content_markdown,
  );

  // Validate all attachments are present and match
  TestValidator.equals(
    "attachments count matches",
    retrievedArticle.discussion_board_attachments.length,
    article.discussion_board_attachments.length,
  );
  for (
    let i = 0;
    i < retrievedArticle.discussion_board_attachments.length;
    i++
  ) {
    const ori = article.discussion_board_attachments[i];
    const ret = retrievedArticle.discussion_board_attachments[i];
    TestValidator.equals(
      `attachment[${i}] filename matches`,
      ret.filename,
      ori.filename,
    );
    TestValidator.equals(
      `attachment[${i}] file_type matches`,
      ret.file_type,
      ori.file_type,
    );
    TestValidator.equals(
      `attachment[${i}] file_url matches`,
      ret.file_url,
      ori.file_url,
    );
  }

  // 4. (Optional) Validate that deleted articles are not accessible
  // Simulation or direct deletion might not be available, so this part is skipped
  // as the current API descriptions do not indicate delete endpoints.
  // If a delete API existed, would call it here and expect error on retrieval.
}
