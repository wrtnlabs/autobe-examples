import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_article_creation_with_attachments(
  connection: api.IConnection,
) {
  // 1. Member registration via join (authenticate as member)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "password1234";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create discussion board article with attachments
  const attachmentList = [
    {
      filename: "image1.png",
      file_type: "image",
      file_url: "https://cdn.example.com/files/image1.png",
    },
    {
      filename: "doc1.pdf",
      file_type: "file",
      file_url: "https://cdn.example.com/files/doc1.pdf",
    },
  ];

  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    content_markdown: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    discussion_board_attachments: attachmentList,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 3. Validate article properties
  TestValidator.predicate(
    "article id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      article.id,
    ),
  );
  TestValidator.equals(
    "article title matches",
    article.title,
    articleCreateBody.title,
  );
  TestValidator.equals(
    "article content_markdown matches",
    article.content_markdown,
    articleCreateBody.content_markdown,
  );

  // 4. Validate attachments count and contents
  TestValidator.equals(
    "article attachments count",
    article.discussion_board_attachments.length,
    attachmentList.length,
  );

  for (let i = 0; i < attachmentList.length; i++) {
    const expected = attachmentList[i];
    const actual = article.discussion_board_attachments[i];

    // Attachment id should be uuid
    TestValidator.predicate(
      "attachment id is uuid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        actual.id,
      ),
    );
    TestValidator.equals(
      `attachment filename matches at index ${i}`,
      actual.filename,
      expected.filename,
    );
    TestValidator.equals(
      `attachment file_type matches at index ${i}`,
      actual.file_type,
      expected.file_type,
    );
    TestValidator.equals(
      `attachment file_url matches at index ${i}`,
      actual.file_url,
      expected.file_url,
    );

    // The attachment's discussion_board_article_id should equal the article.id
    TestValidator.equals(
      `attachment discussion_board_article_id matches article id at index ${i}`,
      actual.discussion_board_article_id,
      article.id,
    );
  }
}
