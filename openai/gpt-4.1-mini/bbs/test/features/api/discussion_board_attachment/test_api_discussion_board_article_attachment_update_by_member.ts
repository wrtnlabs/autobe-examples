import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_article_attachment_update_by_member(
  connection: api.IConnection,
) {
  // Step 1. Member registration and authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "1234",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2. Create article
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    content_markdown: RandomGenerator.content({ paragraphs: 3 }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // Step 3. Create attachment
  const attachmentCreateBody = {
    filename: RandomGenerator.name(1) + ".png",
    file_type: "image/png",
    file_url: `https://example.com/${RandomGenerator.alphaNumeric(16)}.png`,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentCreateBody,
      },
    );
  typia.assert(attachment);

  // Step 4. Update attachment metadata
  const updatedFilename = attachment.filename.replace(/\.png$/, ".jpg");
  const attachmentUpdateBody = {
    filename: updatedFilename,
    file_type: "image/jpeg",
    file_url: attachment.file_url.replace(/\.png$/, ".jpg"),
  } satisfies IDiscussionBoardAttachment.IUpdate;

  const updatedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.update(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: attachmentUpdateBody,
      },
    );
  typia.assert(updatedAttachment);

  // Verify updated metadata
  TestValidator.equals(
    "updated filename should match",
    updatedAttachment.filename,
    updatedFilename,
  );
  TestValidator.equals(
    "updated file_type should be image/jpeg",
    updatedAttachment.file_type,
    "image/jpeg",
  );
  TestValidator.equals(
    "updated file_url should end with .jpg",
    updatedAttachment.file_url.slice(-4),
    ".jpg",
  );
  TestValidator.equals(
    "attachment id should not change",
    updatedAttachment.id,
    attachment.id,
  );
  TestValidator.equals(
    "attachment articleId should not change",
    updatedAttachment.discussion_board_article_id,
    attachment.discussion_board_article_id,
  );

  // Negative test: unauthorized update attempt
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot update attachment",
    async () => {
      await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.update(
        unauthConnection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
          body: {
            filename: "unauthorized.jpg",
          } satisfies IDiscussionBoardAttachment.IUpdate,
        },
      );
    },
  );
}
