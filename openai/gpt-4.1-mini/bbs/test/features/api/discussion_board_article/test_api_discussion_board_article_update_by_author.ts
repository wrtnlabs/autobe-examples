import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test updating an existing discussion board article's title, markdown content,
 * and attachments by the authenticated member who is the author of the
 * article.
 *
 * Steps implemented:
 *
 * 1. Authenticate as a new member (join) to obtain authorization token.
 * 2. Create a new article with title, markdown content, and attachments.
 * 3. Update the article's title, content, and attachments, modifying some
 *    attachments and adding new ones.
 * 4. Assert that the updated article returned by update API matches the update
 *    data, including attachments.
 */
export async function test_api_discussion_board_article_update_by_author(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new member
  const memberCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "password1234",
  } satisfies IDiscussionBoardMember.ICreate;
  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: memberCreateBody,
  });
  typia.assert(authorizedMember);

  // 2. Create a new article with attachments
  const createArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 10 }),
    content_markdown: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 7,
    }),
    discussion_board_attachments: ArrayUtil.repeat(2, () => ({
      filename: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 12,
      }),
      file_type: "image",
      file_url: `https://example.com/${RandomGenerator.alphaNumeric(12)}.png`,
    })),
  } satisfies IDiscussionBoardArticle.ICreate;
  const createdArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: createArticleBody,
      },
    );
  typia.assert(createdArticle);

  // 3. Update the article's title, content and attachments
  const updateArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 8 }),
    content_markdown: RandomGenerator.content({
      paragraphs: 4,
      sentenceMin: 7,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 9,
    }),
    discussion_board_attachments: [
      ...createdArticle.discussion_board_attachments.slice(0, 1).map((att) => ({
        filename: att.filename + " updated",
        file_type: att.file_type,
        file_url: att.file_url,
      })),
      {
        filename: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 10,
        }),
        file_type: "file",
        file_url: `https://example.com/${RandomGenerator.alphaNumeric(12)}.pdf`,
      },
    ],
  } satisfies IDiscussionBoardArticle.IUpdate;
  const updatedArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.update(
      connection,
      {
        articleId: createdArticle.id,
        body: updateArticleBody,
      },
    );
  typia.assert(updatedArticle);

  // 4. Validate the updated article
  TestValidator.equals(
    "article title updated",
    updatedArticle.title,
    updateArticleBody.title,
  );
  TestValidator.equals(
    "article content updated",
    updatedArticle.content_markdown,
    updateArticleBody.content_markdown,
  );
  TestValidator.equals(
    "article attachments length",
    updatedArticle.discussion_board_attachments.length,
    updateArticleBody.discussion_board_attachments.length,
  );
  for (let i = 0; i < updatedArticle.discussion_board_attachments.length; i++) {
    const updatedAtt = updatedArticle.discussion_board_attachments[i];
    const expectedAtt = updateArticleBody.discussion_board_attachments[i];
    TestValidator.equals(
      `attachment filename updated for attachment ${i}`,
      updatedAtt.filename,
      expectedAtt.filename,
    );
    TestValidator.equals(
      `attachment file type updated for attachment ${i}`,
      updatedAtt.file_type,
      expectedAtt.file_type,
    );
    TestValidator.equals(
      `attachment file url updated for attachment ${i}`,
      updatedAtt.file_url,
      expectedAtt.file_url,
    );
  }
}
