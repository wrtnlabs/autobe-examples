import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_attachment_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a member to create an article
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    password: "TestPassword123",
  } satisfies IDiscussionBoardMember.IRegisterRequest;

  const memberAuthorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(memberAuthorized);

  // Step 2: Create an article with the authenticated member
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    category_code: "economics",
    attachments: [
      {
        filename: "test-image.jpg",
        file_type: "image/jpeg",
        file_extension: "jpg",
        file_size: 5242880,
        attachable_type: "article",
      } satisfies IDiscussionBoardAttachment.ICreate,
    ],
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  TestValidator.equals(
    "article title matches input",
    createdArticle.title,
    articleData.title,
  );
  TestValidator.equals(
    "article content matches input",
    createdArticle.content,
    articleData.content,
  );

  // Step 3: Upload an attachment to the article
  const attachmentData = {
    filename: "economics-chart.png",
    file_type: "image/png",
    file_extension: "png",
    file_size: 2097152,
    attachable_type: "article",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const uploadedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: createdArticle.id,
        body: attachmentData,
      },
    );
  typia.assert(uploadedAttachment);

  TestValidator.equals(
    "attachment filename matches",
    uploadedAttachment.filename,
    attachmentData.filename,
  );
  TestValidator.equals(
    "attachment file type matches",
    uploadedAttachment.file_type,
    attachmentData.file_type,
  );
  TestValidator.equals(
    "attachment file size matches",
    uploadedAttachment.file_size,
    attachmentData.file_size,
  );

  // Step 4: Create unauthenticated connection (guest access)
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 5: Retrieve attachment as guest user without authentication
  const retrievedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.articles.attachments.at(
      guestConnection,
      {
        articleId: createdArticle.id,
        attachmentId: uploadedAttachment.id,
      },
    );
  typia.assert(retrievedAttachment);

  // Step 6: Validate attachment metadata is accessible
  TestValidator.equals(
    "retrieved attachment ID matches",
    retrievedAttachment.id,
    uploadedAttachment.id,
  );
  TestValidator.equals(
    "retrieved attachment filename matches",
    retrievedAttachment.filename,
    attachmentData.filename,
  );
  TestValidator.equals(
    "retrieved attachment file type matches",
    retrievedAttachment.file_type,
    attachmentData.file_type,
  );
  TestValidator.equals(
    "retrieved attachment file extension matches",
    retrievedAttachment.file_extension,
    attachmentData.file_extension,
  );
  TestValidator.equals(
    "retrieved attachment file size matches",
    retrievedAttachment.file_size,
    attachmentData.file_size,
  );

  // Step 7: Validate security status is accessible
  TestValidator.predicate(
    "attachment security status is present",
    retrievedAttachment.security_status !== undefined &&
      retrievedAttachment.security_status !== null,
  );

  // Step 8: Validate attachment timestamps are present
  TestValidator.predicate(
    "attachment created_at timestamp is present",
    retrievedAttachment.created_at !== undefined &&
      retrievedAttachment.created_at !== null,
  );
  TestValidator.predicate(
    "attachment updated_at timestamp is present",
    retrievedAttachment.updated_at !== undefined &&
      retrievedAttachment.updated_at !== null,
  );
}
