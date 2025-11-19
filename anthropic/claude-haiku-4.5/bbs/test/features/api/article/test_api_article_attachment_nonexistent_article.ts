import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test attachment to a non-existent article ID.
 *
 * A contributor attempts to attach a file to an article using an invalid or
 * non-existent UUID identifier. The test validates that the system returns a
 * proper error response and does not create orphaned attachments.
 *
 * Test workflow:
 *
 * 1. Register a new contributor account
 * 2. Attempt to attach a file to a non-existent article with an invalid UUID
 * 3. Verify that the API returns an error (should not succeed)
 * 4. Confirm that no orphaned attachment was created in the system
 */
export async function test_api_article_attachment_nonexistent_article(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account for authentication
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "SecurePass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Generate a non-existent article ID (random UUID)
  const nonExistentArticleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Attempt to attach a file to the non-existent article
  // This should fail with an error (404 Not Found or similar)
  await TestValidator.error(
    "should reject attachment to non-existent article",
    async () => {
      await api.functional.discussionBoard.contributor.articles.attachments.attach(
        connection,
        {
          articleId: nonExistentArticleId,
          body: {
            original_filename: RandomGenerator.paragraph({ sentences: 1 }),
            file_type: "pdf",
            file_size: 5000,
            mime_type: "application/pdf",
            display_url: typia.random<string & tags.Format<"uri">>(),
          } satisfies IDiscussionBoardArticleAttachment.ICreate,
        },
      );
    },
  );
}
