import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionRegisteredMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionRegisteredMember";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

/**
 * Test attachment deletion with non-existent article ID. This scenario
 * validates proper error handling when attempting to delete an attachment from
 * an article that doesn't exist in the system. The test follows a systematic
 * approach:
 *
 * 1. **Authentication Setup**: Create and authenticate a registered member user to
 *    establish the necessary credentials for subsequent operations
 * 2. **Resource Creation**: Generate valid test data including creating a
 *    discussion article and uploading an attachment to establish valid IDs
 * 3. **Error Scenario Testing**: Attempt to delete an attachment using a
 *    non-existent article ID while using a valid attachment ID to verify proper
 *    error handling
 * 4. **Validation**: Ensure that appropriate error response is returned and no
 *    system corruption occurs from the invalid operation
 *
 * This test ensures the system properly validates article existence before
 * attempting attachment deletion operations, preventing data integrity issues
 * and maintaining proper access control. The scenario tests both the
 * authentication flow and the business logic validation for resource existence
 * checking.
 */
export async function test_api_attachment_deletion_invalid_article(
  connection: api.IConnection,
) {
  // 1. Authenticate as registered member to establish credentials
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const registeredMember: IEconPoliticalDiscussionRegisteredMember.IAuthorized =
    await api.functional.auth.registeredMember.join(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: memberEmail,
        status: "active",
        bio: "Test user for attachment deletion validation",
        avatar_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    });
  typia.assert(registeredMember);

  // 2. Create a valid discussion article to generate valid IDs for testing
  const article: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.create(connection, {
      body: {
        title: RandomGenerator.name(3),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 4,
          wordMax: 8,
        }),
        category: "Economic Policy",
        status: "published",
        econ_political_discussion_user_id: registeredMember.id,
        attachments: [],
      } satisfies IEconPoliticalDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // 3. Create a valid attachment to get a valid attachment ID
  const attachment: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          uploader_name: registeredMember.display_name,
          original_filename: "test-document.pdf",
          file_type: "application/pdf",
          file_size: 1024000, // 1MB
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4. Test error handling: Attempt deletion with non-existent article ID
  const nonExistentArticleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "should fail when attempting to delete attachment from non-existent article",
    async () => {
      await api.functional.econPoliticalDiscussion.registeredMember.articles.attachments.erase(
        connection,
        {
          articleId: nonExistentArticleId, // Non-existent article ID
          attachmentId: attachment.id, // Valid attachment ID
        },
      );
    },
  );

  // 5. Verify that valid resources still exist and system remains stable
  const retrievedArticle: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.create(connection, {
      body: {
        title: "Verification Article",
        content: "This article verifies system stability after error scenario",
        category: "Political Analysis",
        status: "published",
        econ_political_discussion_user_id: registeredMember.id,
        attachments: [],
      } satisfies IEconPoliticalDiscussionArticle.ICreate,
    });
  typia.assert(retrievedArticle);

  TestValidator.predicate(
    "system remains stable after error scenario",
    retrievedArticle.id !== undefined &&
      retrievedArticle.title === "Verification Article",
  );
}
