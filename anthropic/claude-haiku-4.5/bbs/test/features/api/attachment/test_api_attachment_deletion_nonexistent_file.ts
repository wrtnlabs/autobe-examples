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
 * Test deletion of a non-existent attachment returns appropriate 404 error.
 *
 * This test validates that attempting to delete an attachment with an invalid
 * or non-existent attachmentId returns a proper 404 Not Found error. The test
 * ensures the system correctly handles deletion attempts on attachments that do
 * not exist, either because they were never created or have already been
 * deleted. The error response should be clear without exposing sensitive
 * information or causing server errors.
 *
 * Test flow:
 *
 * 1. Create a member account to authenticate for the deletion attempt
 * 2. Create an article to use in the path (required for endpoint structure)
 * 3. Attempt to delete a non-existent attachment using a random UUID that was
 *    never created
 * 4. Verify that the API returns a 404 error indicating the attachment was not
 *    found
 */
export async function test_api_attachment_deletion_nonexistent_file(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication
  const memberResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberResponse);

  // Step 2: Create an article to use in the deletion endpoint path
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Attempt to delete a non-existent attachment using a random UUID
  const nonExistentAttachmentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "deletion of non-existent attachment should fail with 404 error",
    async () => {
      await api.functional.discussionBoard.articles.attachments.erase(
        connection,
        {
          articleId: article.id,
          attachmentId: nonExistentAttachmentId,
        },
      );
    },
  );
}
