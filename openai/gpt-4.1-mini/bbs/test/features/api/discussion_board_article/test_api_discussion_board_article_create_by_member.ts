import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test complete article creation workflow by an authenticated member, including
 * optional multiple attachments. Validate that the article is created with
 * correct title and markdown content, attachments are associated properly.
 * Confirm response contains created article and attachments.
 */
export async function test_api_discussion_board_article_create_by_member(
  connection: api.IConnection,
) {
  // 1. Register new member to authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "StrongP@ssword123";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Prepare attachments
  const attachmentsCount = RandomGenerator.pick([0, 1, 3, 5]);
  const attachments = ArrayUtil.repeat(attachmentsCount, () => {
    const fileType = RandomGenerator.pick(["image", "file"] as const);
    return {
      filename:
        RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }) +
        (fileType === "image" ? ".png" : ".pdf"),
      file_type: fileType,
      file_url: `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(12)}.${
        fileType === "image" ? "png" : "pdf"
      }`,
    };
  });

  // 3. Prepare article creation request
  const title = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const contentMarkdown = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 10,
  });

  const requestBody = {
    title: title,
    content_markdown: contentMarkdown,
    discussion_board_attachments:
      attachmentsCount > 0 ? attachments : undefined,
  } satisfies IDiscussionBoardArticle.ICreate;

  // 4. Create article
  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      { body: requestBody },
    );
  typia.assert(createdArticle);

  // 5. Validate article fields
  TestValidator.equals(
    "title matches input",
    createdArticle.title,
    requestBody.title,
  );
  TestValidator.equals(
    "content_markdown matches input",
    createdArticle.content_markdown,
    requestBody.content_markdown,
  );

  // 6. Validate attachments
  if (attachmentsCount === 0) {
    TestValidator.predicate(
      "attachments array is empty",
      createdArticle.discussion_board_attachments.length === 0,
    );
  } else {
    TestValidator.equals(
      "attachments count",
      createdArticle.discussion_board_attachments.length,
      attachmentsCount,
    );

    for (const attachment of createdArticle.discussion_board_attachments) {
      typia.assert(attachment);
      // Find matching input attachment
      const matched = attachments.find(
        (a) =>
          a.filename === attachment.filename &&
          a.file_type === attachment.file_type &&
          a.file_url === attachment.file_url,
      );
      TestValidator.predicate(
        `attachment ${attachment.filename} is included in request`,
        matched !== undefined,
      );
    }
  }
}
