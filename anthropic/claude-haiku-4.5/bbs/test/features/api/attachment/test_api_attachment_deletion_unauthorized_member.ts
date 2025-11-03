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
 * Validates unauthorized attachment deletion prevention.
 *
 * Tests that the system enforces ownership restrictions when deleting
 * attachments. Member A creates an article and uploads an attachment. Member B
 * attempts to delete Member A's attachment and receives a 403 Forbidden error.
 * The test confirms the attachment remains in the system after the failed
 * deletion attempt.
 *
 * 1. Register Member A (uploader)
 * 2. Create article by Member A
 * 3. Upload attachment by Member A
 * 4. Register Member B (unauthorized deleter)
 * 5. Attempt to delete attachment as Member B (should fail with 403 Forbidden)
 * 6. Verify authorization enforcement works correctly
 */
export async function test_api_attachment_deletion_unauthorized_member(
  connection: api.IConnection,
) {
  // 1. Register Member A (attachment uploader)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAAuthorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberAEmail,
        password: "SecurePassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberAAuthorized);

  // 2. Create article by Member A
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Test Article for Attachment",
        content:
          "This article contains test attachments that will be managed by different members.",
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3. Upload attachment by Member A
  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "test-document.pdf",
          file_type: "application/pdf",
          file_extension: "pdf",
          file_size: 5242880,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4. Register Member B (unauthorized deleter)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBAuthorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberBEmail,
        password: "AnotherPassword456",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberBAuthorized);

  // 5. Attempt to delete attachment as Member B (should fail with 403 Forbidden)
  await TestValidator.httpError(
    "member B should not be able to delete member A's attachment",
    403,
    async () => {
      await api.functional.discussionBoard.articles.attachments.erase(
        connection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
        },
      );
    },
  );
}
