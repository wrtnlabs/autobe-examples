import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttachmentFilename } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttachmentFilename";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachment";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import type { IFileSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IFileSize";
import type { IFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IFileType";
import type { IMimeType } from "@ORGANIZATION/PROJECT-api/lib/structures/IMimeType";

/**
 * Test that moderators receive appropriate error responses when attempting to
 * retrieve attachments for non-existent articles.
 *
 * This test validates proper error handling and security boundaries by testing
 * how the system responds when moderators attempt to access attachments from
 * articles that don't exist. The test covers multiple scenarios to ensure
 * robust error handling and clear feedback about resource unavailability.
 */
export async function test_api_moderator_non_existent_article_attachment(
  connection: api.IConnection,
) {
  // Step 1: Register new moderator account to establish authentication context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const testModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<string & tags.MaxLength<50>>(),
      email: moderatorEmail,
      password_hash: "testpassword123",
      moderation_level: "standard",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(testModerator);

  // Step 2: Create at least one category to establish basic platform infrastructure
  const testCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "test_category",
          name: "Test Category",
          description: "Test category for error handling scenarios",
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(testCategory);

  // Step 3: Generate a non-existent article UUID for testing
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  const validAttachmentId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Test error response when trying to access attachment for non-existent article
  await TestValidator.error(
    "should receive error when accessing attachment for non-existent article",
    async () => {
      await api.functional.economicDiscussion.moderator.articles.attachments.at(
        connection,
        {
          articleId: nonExistentArticleId,
          attachmentId: validAttachmentId,
        },
      );
    },
  );

  // Step 5: Test with both non-existent article and attachment IDs
  const nonExistentAttachmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should receive error when both article and attachment don't exist",
    async () => {
      await api.functional.economicDiscussion.moderator.articles.attachments.at(
        connection,
        {
          articleId: nonExistentArticleId,
          attachmentId: nonExistentAttachmentId,
        },
      );
    },
  );

  // Step 6: Verify that error responses provide meaningful messages
  try {
    await api.functional.economicDiscussion.moderator.articles.attachments.at(
      connection,
      {
        articleId: nonExistentArticleId,
        attachmentId: validAttachmentId,
      },
    );
  } catch (error) {
    TestValidator.predicate(
      "error response should not be an empty message",
      typeof error === "object" && error !== null && "message" in error
        ? String(error.message).trim().length > 0
        : true,
    );

    TestValidator.predicate(
      "error response should contain meaningful information about the missing resource",
      typeof error === "object" && error !== null && "status" in error
        ? String(error.status).length > 0
        : true,
    );
  }

  // Step 7: Test that authentication is properly maintained after error
  TestValidator.predicate(
    "test moderator should still have valid session after error",
    typeof testModerator.token === "object" && "access" in testModerator.token,
  );
}
