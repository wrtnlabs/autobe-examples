import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderator attachment deletion endpoint requires proper moderator
 * authentication.
 *
 * This test validates role-based access control for the attachment deletion
 * endpoint. The endpoint should only allow authenticated moderators to delete
 * attachments. Unauthenticated requests and requests from non-moderator roles
 * (contributors) must be properly rejected.
 *
 * Test workflow:
 *
 * 1. Create contributor account and authenticate
 * 2. Create article draft with content
 * 3. Attach a file to the article
 * 4. Attempt unauthenticated deletion of attachment
 * 5. Verify 401 Unauthorized response
 * 6. Verify attachment still exists (not deleted)
 * 7. Attempt deletion with contributor authentication
 * 8. Verify 403 Forbidden response (insufficient permissions)
 * 9. Verify attachment still exists
 * 10. Authenticate as moderator and successfully delete attachment
 */
export async function test_api_article_attachment_deletion_moderator_unauthenticated_rejection(
  connection: api.IConnection,
) {
  // Step 1: Create contributor account for test data setup
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "TempPass123!@";
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphabets(8),
      password: contributorPassword,
      href: "http://localhost/register",
      referrer: "http://localhost/",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Step 2: Create article with attachments
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Test Article for Attachment Deletion",
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: categoryId,
          href: "http://localhost/articles/create",
          referrer: "http://localhost/",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Attach a file to the article
  const attachment =
    await api.functional.discussionBoard.contributor.articles.attachments.attach(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: "test_document.pdf",
          file_type: "pdf",
          file_size: 102400,
          mime_type: "application/pdf",
          display_url: "http://localhost/files/test_document.pdf",
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // Step 4-5: Attempt unauthenticated deletion of attachment
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "unauthenticated deletion should return 401 Unauthorized",
    401,
    async () => {
      await api.functional.discussionBoard.moderator.articles.attachments.erase(
        unauthConnection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
        },
      );
    },
  );

  // Step 6: Verify attachment still exists after failed unauthenticated deletion
  TestValidator.predicate(
    "attachment should still exist after failed unauthenticated deletion",
    attachment.id.length > 0,
  );

  // Step 7-8: Attempt deletion with contributor authentication (should fail with 403)
  await TestValidator.httpError(
    "contributor deletion attempt should return 403 Forbidden",
    403,
    async () => {
      await api.functional.discussionBoard.moderator.articles.attachments.erase(
        connection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
        },
      );
    },
  );

  // Step 9: Verify attachment still exists after contributor deletion attempt
  TestValidator.predicate(
    "attachment should still exist after contributor deletion attempt",
    attachment.id.length > 0,
  );

  // Step 10: Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModPass123!@";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8),
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Switch to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost/moderator/login",
      referrer: "http://localhost/",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Moderator successfully deletes attachment
  await api.functional.discussionBoard.moderator.articles.attachments.erase(
    connection,
    {
      articleId: article.id,
      attachmentId: attachment.id,
    },
  );

  TestValidator.predicate(
    "moderator should successfully delete attachment",
    true,
  );
}
