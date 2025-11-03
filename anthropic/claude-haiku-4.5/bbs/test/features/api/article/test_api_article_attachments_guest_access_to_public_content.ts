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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";

/**
 * Validates guest user access to attachments on published discussion board
 * articles.
 *
 * This test ensures that unauthenticated guest users can retrieve and view
 * attachment metadata from publicly accessible articles while respecting
 * security status checks. The workflow creates a member account with a
 * published article containing attachments marked as safe, then verifies guest
 * users can retrieve the attachment list with proper filtering and pagination.
 *
 * Test steps:
 *
 * 1. Create and authenticate a member account
 * 2. Create and publish an article with the economics category
 * 3. Upload attachments to the published article (marked as safe)
 * 4. Create an unauthenticated connection (guest user session)
 * 5. Retrieve attachment list as guest user with pagination
 * 6. Verify attachment metadata is visible and accessible
 * 7. Validate that only safe attachments are returned
 * 8. Test filtering and search capabilities for guest access
 */
export async function test_api_article_attachments_guest_access_to_public_content(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password123";

  const authResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(authResponse);
  typia.assert(authResponse.token);

  // Step 2: Create and publish an article with attachments
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        category_code: "economics",
        attachments: [],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  TestValidator.equals(
    "article published with published status",
    article.status,
    "published",
  );

  // Step 3: Upload attachments to the published article
  const attachment1 =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "report.pdf",
          file_type: "application/pdf",
          file_extension: "pdf",
          file_size: 51200,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment1);
  TestValidator.equals(
    "first attachment security status should be safe",
    attachment1.security_status,
    "safe",
  );

  const attachment2 =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "chart.png",
          file_type: "image/png",
          file_extension: "png",
          file_size: 204800,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment2);
  TestValidator.equals(
    "second attachment security status should be safe",
    attachment2.security_status,
    "safe",
  );

  // Step 4: Create an unauthenticated connection (guest user session)
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 5: Retrieve attachment list as guest user with pagination
  const attachmentPage =
    await api.functional.discussionBoard.articles.attachments.index(
      guestConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          security_status: "safe",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(attachmentPage);

  // Step 6: Verify attachment metadata is visible and accessible
  TestValidator.predicate(
    "guest can see attachment list pagination",
    attachmentPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "at least 2 attachments should be returned",
    attachmentPage.data.length >= 2,
  );

  // Step 7: Validate that only safe attachments are returned
  const safeAttachments = attachmentPage.data.filter(
    (att) => att.security_status === "safe",
  );
  TestValidator.equals(
    "all returned attachments should have safe security status",
    safeAttachments.length,
    attachmentPage.data.length,
  );

  // Step 8: Test filtering by security status for guest access
  const filteredPage =
    await api.functional.discussionBoard.articles.attachments.index(
      guestConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          security_status: "safe",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(filteredPage);
  TestValidator.predicate(
    "filtered safe attachments should be accessible to guest",
    filteredPage.data.length > 0,
  );

  // Verify attachment details are populated
  for (const attachment of filteredPage.data) {
    TestValidator.predicate(
      "attachment should have id",
      attachment.id !== undefined && attachment.id.length > 0,
    );
    TestValidator.predicate(
      "attachment should have filename",
      attachment.filename !== undefined && attachment.filename.length > 0,
    );
    TestValidator.predicate(
      "attachment should have file_type",
      attachment.file_type !== undefined && attachment.file_type.length > 0,
    );
    TestValidator.predicate(
      "attachment should have file_size",
      attachment.file_size > 0,
    );
  }
}
