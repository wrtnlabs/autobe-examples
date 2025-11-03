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
 * E2E test to validate member can update discussion board article.
 *
 * This test simulates the full flow:
 *
 * 1. A member joins (signs up) to acquire authorization.
 * 2. The member creates a discussion board article with title, markdown content,
 *    and attachments.
 * 3. The member updates the article by changing the title, content_markdown, and
 *    attachments.
 * 4. Validate the updated article is returned and fields match the update.
 */
export async function test_api_discussion_board_article_update_by_member(
  connection: api.IConnection,
) {
  // 1. Member registration and authentication
  const memberCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardMember.ICreate;
  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberCreate });
  typia.assert(memberAuth);

  // 2. Create initial article with attachments
  const attachmentsCreate = ArrayUtil.repeat(2, () => ({
    filename: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    file_type: RandomGenerator.pick(["image", "file"] as const),
    file_url: `https://example.com/files/${RandomGenerator.alphaNumeric(12)}`,
  }));

  const articleCreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 6, wordMax: 12 }),
    content_markdown: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    discussion_board_attachments: attachmentsCreate,
  } satisfies IDiscussionBoardArticle.ICreate;
  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      { body: articleCreate },
    );
  typia.assert(createdArticle);

  // 3. Prepare update with changed title, content, and attachments
  const attachmentsUpdate = attachmentsCreate.map((attachment) => ({
    filename: attachment.filename + " updated",
    file_type: attachment.file_type,
    file_url: attachment.file_url + "?v2",
  })) as IDiscussionBoardAttachment.IUpdate[];

  const articleUpdate = {
    title: createdArticle.title + " Updated",
    content_markdown:
      createdArticle.content_markdown + "\n\nAdditional content added.",
    discussion_board_attachments: attachmentsUpdate,
  } satisfies IDiscussionBoardArticle.IUpdate;

  // 4. Update the article
  const updatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.update(
      connection,
      {
        articleId: createdArticle.id,
        body: articleUpdate,
      },
    );
  typia.assert(updatedArticle);

  // 5. Validate updated fields
  TestValidator.equals(
    "Updated title should match",
    updatedArticle.title,
    articleUpdate.title,
  );
  TestValidator.equals(
    "Updated markdown content should match",
    updatedArticle.content_markdown,
    articleUpdate.content_markdown,
  );

  // Attachments count should match update
  TestValidator.equals(
    "Attachments count should match",
    updatedArticle.discussion_board_attachments.length,
    attachmentsUpdate.length,
  );

  // Validate each attachment was updated correctly
  for (let i = 0; i < attachmentsUpdate.length; ++i) {
    const updatedAttach = updatedArticle.discussion_board_attachments[i];
    const expectedAttach = attachmentsUpdate[i];
    TestValidator.equals(
      `Attachment filename #${i} should match`,
      updatedAttach.filename,
      expectedAttach.filename ?? updatedAttach.filename,
    );
    TestValidator.equals(
      `Attachment file_type #${i} should match`,
      updatedAttach.file_type,
      expectedAttach.file_type ?? updatedAttach.file_type,
    );
    TestValidator.equals(
      `Attachment file_url #${i} should match`,
      updatedAttach.file_url,
      expectedAttach.file_url ?? updatedAttach.file_url,
    );
  }
}
