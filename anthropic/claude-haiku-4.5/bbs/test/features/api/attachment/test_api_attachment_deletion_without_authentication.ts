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
 * Validates that unauthenticated guest users cannot delete attachments and
 * receive 401 Unauthorized error.
 *
 * This test ensures the system enforces proper authentication checks on
 * sensitive operations like file deletion. Guest users attempting to delete
 * attachments should be rejected with a 401 error and prompted to log in,
 * maintaining security by preventing unauthorized file removal from the
 * platform.
 *
 * Test flow:
 *
 * 1. Create and authenticate a member account
 * 2. Create an article with the authenticated member
 * 3. Upload an attachment to the article
 * 4. Simulate a guest user by removing authentication credentials
 * 5. Attempt to delete the attachment as an unauthenticated user
 * 6. Verify that the system returns a 401 Unauthorized error
 */
export async function test_api_attachment_deletion_without_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);

  // Step 2: Create an article with the authenticated member
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 2,
          wordMax: 5,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Upload an attachment to the article
  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "test-document.pdf",
          file_type: "application/pdf",
          file_extension: "pdf",
          file_size: 5000,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // Step 4: Create an unauthenticated connection (simulate guest user)
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 5 & 6: Attempt to delete the attachment as an unauthenticated user
  // Should return 401 Unauthorized error
  await TestValidator.error(
    "guest user cannot delete attachment - should return 401 Unauthorized",
    async () => {
      await api.functional.discussionBoard.articles.attachments.erase(
        guestConnection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
        },
      );
    },
  );
}
