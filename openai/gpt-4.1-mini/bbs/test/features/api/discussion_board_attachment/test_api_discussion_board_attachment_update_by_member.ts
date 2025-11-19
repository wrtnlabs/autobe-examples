import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_attachment_update_by_member(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new discussion board member
  // Generate realistic and valid member registration data
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "p@ssw0rd123";
  const memberNickname = RandomGenerator.name();

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        nickname: memberNickname,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a new discussion board article as the authenticated member
  const newArticleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const newArticleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 4,
    wordMax: 7,
  });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: {
          title: newArticleTitle,
          content: newArticleContent,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 3. Upload a new attachment to the created article
  // Select attachment type randomly as either "image" or "file"
  const attachmentType = RandomGenerator.pick(["image", "file"] as const);
  const attachmentUrl = `https://cdn.example.com/uploads/${RandomGenerator.alphaNumeric(16)}`;
  const attachmentFilename = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 15,
  });

  const createdAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.create(
      connection,
      {
        id: article.id,
        body: {
          type: attachmentType,
          url: attachmentUrl,
          filename: attachmentFilename,
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(createdAttachment);
  TestValidator.equals(
    "attachment article ID matches article",
    createdAttachment.discussionBoardArticleId,
    article.id,
  );
  TestValidator.equals(
    "attachment type matches create request",
    createdAttachment.type,
    attachmentType,
  );
  TestValidator.equals(
    "attachment URL matches create request",
    createdAttachment.url,
    attachmentUrl,
  );
  TestValidator.equals(
    "attachment filename matches create request",
    createdAttachment.fileName,
    attachmentFilename,
  );

  // 4. Update the uploaded attachment metadata
  // Change the attachment type to the opposite type
  const updatedType = attachmentType === "image" ? "file" : "image";
  const updatedUrl = `https://cdn.example.com/updated/${RandomGenerator.alphaNumeric(16)}`;
  const updatedFilename = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 15,
  });

  const updatedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.update(
      connection,
      {
        id: article.id,
        attachmentId: createdAttachment.id,
        body: {
          type: updatedType,
          url: updatedUrl,
          filename: updatedFilename,
        } satisfies IDiscussionBoardAttachment.IUpdate,
      },
    );
  typia.assert(updatedAttachment);

  // 5. Verify updated attachment matches update request
  TestValidator.equals(
    "updated attachment article ID matches article",
    updatedAttachment.discussionBoardArticleId,
    article.id,
  );
  TestValidator.equals(
    "updated attachment ID matches original attachment",
    updatedAttachment.id,
    createdAttachment.id,
  );
  TestValidator.equals(
    "updated attachment type matches update request",
    updatedAttachment.type,
    updatedType,
  );
  TestValidator.equals(
    "updated attachment URL matches update request",
    updatedAttachment.url,
    updatedUrl,
  );
  TestValidator.equals(
    "updated attachment filename matches update request",
    updatedAttachment.fileName,
    updatedFilename,
  );
}
