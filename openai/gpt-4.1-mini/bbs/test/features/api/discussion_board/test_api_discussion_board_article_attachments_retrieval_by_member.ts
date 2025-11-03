import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";

export async function test_api_discussion_board_article_attachments_retrieval_by_member(
  connection: api.IConnection,
) {
  // 1. Member signs up
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "P@ssw0rd123";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create an article with attachments
  const attachmentCount = 3;
  const attachmentsCreateBody: IDiscussionBoardArticle.ICreate["discussion_board_attachments"] =
    ArrayUtil.repeat(attachmentCount, () => {
      const filename = RandomGenerator.name(1) + ".txt";
      const fileType = "text/plain";
      const fileUrl = `https://files.example.com/${filename}`;
      return {
        filename,
        file_type: fileType,
        file_url: fileUrl,
      };
    });

  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 6, wordMax: 12 }),
    content_markdown: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    discussion_board_attachments: attachmentsCreateBody,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      { body: createBody },
    );
  typia.assert(article);

  // 3. Create attachments explicitly to ensure existence with the create attachments API
  await ArrayUtil.asyncForEach(
    article.discussion_board_attachments,
    async (a) => {
      const createAttachmentBody: IDiscussionBoardAttachment.ICreate = {
        filename: a.filename,
        file_type: a.file_type,
        file_url: a.file_url,
      };
      const createdAttachment =
        await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.create(
          connection,
          {
            articleId: article.id,
            body: createAttachmentBody,
          },
        );
      typia.assert(createdAttachment);
      TestValidator.equals(
        "attachment article id matchs",
        createdAttachment.discussion_board_article_id,
        article.id,
      );
    },
  );

  // 4. Retrieve attachments with pagination and filtering
  // Use page=1 and limit=2 to test pagination and filtering behavior
  const page = 1 satisfies number & tags.Type<"int32">;
  const limit = 2 satisfies number & tags.Type<"int32">;

  const findBody: IDiscussionBoardAttachment.IRequest = {
    page,
    limit,
    discussion_board_article_id: article.id,
    // No search, sort, filename, or file_type filters to get all attachments
  };

  const retrievedPage: IPageIDiscussionBoardAttachment.ISummary =
    await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.index(
      connection,
      {
        articleId: article.id,
        body: findBody,
      },
    );
  typia.assert(retrievedPage);

  // 5. Validate pagination
  TestValidator.equals(
    "pagination current equals page",
    retrievedPage.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit equals limit",
    retrievedPage.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    retrievedPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages at least 1",
    retrievedPage.pagination.pages >= 1,
  );

  // 6. Validate each retrieved attachment belongs to the article
  for (const attachment of retrievedPage.data) {
    typia.assert(attachment);
    TestValidator.equals(
      "attachment article id equals article id",
      attachment.discussion_board_article_id,
      article.id,
    );
  }

  // 7. Validate the number of attachments in the response respect the limit
  TestValidator.predicate(
    "retrieved attachments count less or equal limit",
    retrievedPage.data.length <= limit,
  );

  // 8. Validate retrieved attachments exist in the created attachments
  for (const attachment of retrievedPage.data) {
    TestValidator.predicate(
      "retrieved attachment belongs to created attachments",
      article.discussion_board_attachments.some(
        (a) =>
          a.filename === attachment.filename &&
          a.file_url === attachment.file_url,
      ),
    );
  }
}
