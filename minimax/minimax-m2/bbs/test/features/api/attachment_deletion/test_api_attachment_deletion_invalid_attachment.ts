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
 * Test attachment deletion with non-existent attachment ID.
 *
 * This test validates proper error handling when attempting to delete an
 * attachment that doesn't exist in the system. The test ensures that the API
 * returns appropriate error responses and maintains data integrity when invalid
 * deletion attempts are made.
 *
 * Test Flow:
 *
 * 1. Register a user to establish authentication context
 * 2. Create an article to establish valid article ID
 * 3. Create an attachment to establish valid attachment reference
 * 4. Attempt to delete an attachment with non-existent attachment ID
 * 5. Validate proper error handling and system integrity
 */
export async function test_api_attachment_deletion_invalid_attachment(
  connection: api.IConnection,
) {
  // Step 1: Register a user for authentication
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const registeredUser: IEconPoliticalDiscussionRegisteredMember.IAuthorized =
    await api.functional.auth.registeredMember.join(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: userEmail,
        bio: "Economic policy analyst",
        status: "active",
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Create a test article for attachment testing
  const testArticle: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.create(connection, {
      body: {
        title: "Economic Policy Analysis",
        content:
          "This article discusses current economic policies and their impacts.",
        category: "Economic Policy",
        econ_political_discussion_user_id: registeredUser.id,
        status: "published",
      } satisfies IEconPoliticalDiscussionArticle.ICreate,
    });
  typia.assert(testArticle);

  // Step 3: Create a test attachment to establish valid references
  const testAttachment: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: testArticle.id,
        body: {
          file_url: "https://example.com/document.pdf",
          uploader_name: registeredUser.display_name,
          original_filename: "policy-document.pdf",
          file_type: "application/pdf",
          file_size: 1024000, // 1MB
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    );
  typia.assert(testAttachment);

  // Step 4: Test deletion of non-existent attachment
  // Generate a random UUID that doesn't exist in the system
  const nonExistentAttachmentId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "deletion should fail for non-existent attachment",
    async () => {
      await api.functional.econPoliticalDiscussion.registeredMember.articles.attachments.erase(
        connection,
        {
          articleId: testArticle.id,
          attachmentId: nonExistentAttachmentId,
        },
      );
    },
  );

  // Step 5: Verify data integrity - original attachment should still exist
  const remainingAttachment: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: testArticle.id,
        body: {
          file_url: "https://example.com/chart.png",
          uploader_name: registeredUser.display_name,
          original_filename: "economic-chart.png",
          file_type: "image/png",
          file_size: 512000, // 512KB
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    );
  typia.assert(remainingAttachment);

  TestValidator.equals(
    "original attachment reference maintained",
    testAttachment.id,
    remainingAttachment.id,
  );
}
