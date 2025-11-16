import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test error handling when attempting to update a non-existent article.
 *
 * This test validates that the API properly rejects update requests for
 * articles that don't exist in the database. It ensures the system handles
 * invalid article IDs gracefully and returns appropriate error responses.
 *
 * Test Flow:
 *
 * 1. Create and authenticate a member account
 * 2. Generate a valid UUID that doesn't correspond to any existing article
 * 3. Prepare valid update data (title and body)
 * 4. Attempt to update the non-existent article
 * 5. Verify the operation fails with an appropriate error
 * 6. Confirm proper error handling without system crashes
 */
export async function test_api_article_update_nonexistent_article(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Generate a valid UUID that doesn't correspond to any existing article
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Prepare valid update data that meets DTO constraints
  const updateData = {
    title: RandomGenerator.paragraph({ sentences: 8, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.IUpdate;

  // Step 4 & 5: Attempt to update the non-existent article and verify it fails
  await TestValidator.error(
    "update non-existent article should fail",
    async () => {
      await api.functional.discussionBoard.member.articles.update(connection, {
        articleId: nonExistentArticleId,
        body: updateData,
      });
    },
  );
}
