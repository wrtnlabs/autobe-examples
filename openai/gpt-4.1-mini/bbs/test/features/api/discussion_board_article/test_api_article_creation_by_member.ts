import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_article_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Member join to authenticate
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "strong_password_1234",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Prepare article creation data
  const attachment1 = {
    filename: "picture1.png",
    file_type: "image",
    file_url: `https://example.com/${RandomGenerator.alphaNumeric(12)}.png`,
  };

  const attachment2 = {
    filename: "document1.pdf",
    file_type: "file",
    file_url: `https://example.com/${RandomGenerator.alphaNumeric(12)}.pdf`,
  };

  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 9 }),
    content_markdown: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    discussion_board_attachments: [attachment1, attachment2],
  } satisfies IDiscussionBoardArticle.ICreate;

  // 3. Create the article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(article);

  // 4. Validate the created article's data
  TestValidator.equals(
    "article title matches",
    article.title,
    createBody.title,
  );
  TestValidator.equals(
    "article content_markdown matches",
    article.content_markdown,
    createBody.content_markdown,
  );
  TestValidator.predicate(
    "has discussion_board_attachments",
    Array.isArray(article.discussion_board_attachments),
  );
  TestValidator.equals(
    "attachments count matches",
    article.discussion_board_attachments.length,
    createBody.discussion_board_attachments.length,
  );

  // 5. Validate each attachment
  for (const attachment of article.discussion_board_attachments) {
    typia.assert(attachment);
    TestValidator.predicate(
      "attachment filename present",
      typeof attachment.filename === "string" && attachment.filename.length > 0,
    );
    TestValidator.predicate(
      "attachment file_type is valid",
      attachment.file_type === "image" || attachment.file_type === "file",
    );
    TestValidator.predicate(
      "attachment file_url is non-empty string",
      typeof attachment.file_url === "string" && attachment.file_url.length > 0,
    );
    TestValidator.equals(
      "attachment linked to article",
      attachment.discussion_board_article_id,
      article.id,
    );
  }
}
