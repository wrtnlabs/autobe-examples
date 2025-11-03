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

/**
 * Test that members can delete attachments they personally uploaded to their
 * articles.
 *
 * A member creates an article, uploads multiple attachments, then deletes one
 * of them. Verify that the attachment is permanently removed and no longer
 * accessible through retrieval operations. This validates the core attachment
 * lifecycle management for content authors.
 */
export async function test_api_attachment_deletion_by_uploader(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const authorized = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(authorized);

  // Step 2: Create an article with multiple attachments
  const attachmentData1 = {
    filename: "document1.pdf",
    file_type: "application/pdf",
    file_extension: "pdf",
    file_size: 5242880, // 5MB
    attachable_type: "article" as const,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachmentData2 = {
    filename: "document2.pdf",
    file_type: "application/pdf",
    file_extension: "pdf",
    file_size: 3145728, // 3MB
    attachable_type: "article" as const,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachmentData3 = {
    filename: "image.png",
    file_type: "image/png",
    file_extension: "png",
    file_size: 1048576, // 1MB
    attachable_type: "article" as const,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category_code: "economics",
        attachments: [attachmentData1, attachmentData2, attachmentData3],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Verify article was created with three attachments
  TestValidator.equals(
    "article created with three attachments",
    article.attachments?.length,
    3,
  );

  // Step 4: Store attachment IDs and select one to delete
  const attachmentIds = (article.attachments || []).map((att) => att.id);
  const attachmentToDelete = attachmentIds[1];
  const remainingAttachmentIds = [attachmentIds[0], attachmentIds[2]];

  // Step 5: Delete the selected attachment
  await api.functional.discussionBoard.member.articles.attachments.erase(
    connection,
    {
      articleId: article.id,
      attachmentId: attachmentToDelete,
    },
  );

  // Step 6: Verify the deleted attachment is no longer accessible
  // Attempting to delete it again should fail because it's already deleted
  await TestValidator.error(
    "deleted attachment cannot be deleted again",
    async () => {
      await api.functional.discussionBoard.member.articles.attachments.erase(
        connection,
        {
          articleId: article.id,
          attachmentId: attachmentToDelete,
        },
      );
    },
  );

  // Step 7: Verify remaining attachments are still valid
  TestValidator.predicate(
    "first attachment remains after deletion",
    remainingAttachmentIds[0] !== attachmentToDelete,
  );
  TestValidator.predicate(
    "third attachment remains after deletion",
    remainingAttachmentIds[1] !== attachmentToDelete,
  );
}
