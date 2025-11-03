import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_article_attachment_retrieval_by_member(
  connection: api.IConnection,
) {
  // 1. Member joins and authenticates
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: `user${Date.now()}@example.com`,
        password: "p@ssword123",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a new discussion board article under authenticated member
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content_markdown: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardArticle.ICreate;
  // We won't include attachments here to simplify attachment creation step
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(article);

  // 3. Create an attachment for the article
  const attachmentInput = {
    filename: "image1.png",
    file_type: "image/png",
    file_url: `https://example.com/uploads/image1.png`,
  } satisfies IDiscussionBoardAttachment.ICreate;
  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentInput,
      },
    );
  typia.assert(attachment);

  // Validations: Check the created attachment's critical fields
  TestValidator.equals(
    "attachment discussion_board_article_id matches article id",
    attachment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "attachment filename matches input",
    attachment.filename,
    attachmentInput.filename,
  );
  TestValidator.equals(
    "attachment file_type matches input",
    attachment.file_type,
    attachmentInput.file_type,
  );
  TestValidator.equals(
    "attachment file_url matches input",
    attachment.file_url,
    attachmentInput.file_url,
  );

  // 4. Retrieve the specific attachment by articleId and attachmentId
  const retrieved: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.at(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(retrieved);

  // 5. Validate retrieved attachment metadata matches the created one
  TestValidator.equals(
    "retrieved attachment id matches created",
    retrieved.id,
    attachment.id,
  );
  TestValidator.equals(
    "retrieved attachment belongs to correct article",
    retrieved.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "retrieved attachment filename matches",
    retrieved.filename,
    attachment.filename,
  );
  TestValidator.equals(
    "retrieved attachment file_type matches",
    retrieved.file_type,
    attachment.file_type,
  );
  TestValidator.equals(
    "retrieved attachment file_url matches",
    retrieved.file_url,
    attachment.file_url,
  );

  // 6. Validate timestamps are defined and valid ISO date-time strings
  TestValidator.predicate(
    "created_at is ISO datetime string",
    typeof retrieved.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is ISO datetime string",
    typeof retrieved.updated_at === "string",
  );
  // deleted_at may be null or undefined
  TestValidator.predicate(
    "deleted_at is null or string or undefined",
    retrieved.deleted_at === null ||
      typeof retrieved.deleted_at === "string" ||
      retrieved.deleted_at === undefined,
  );
}
