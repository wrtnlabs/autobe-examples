import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";

/**
 * Test deleting comment from non-existent article.
 *
 * Validates that attempting to delete a comment on an article that doesn't
 * exist returns appropriate error response. This tests the system's ability to
 * handle deletion operations with invalid article IDs while maintaining proper
 * error handling.
 *
 * Test flow:
 *
 * 1. Create member account for authentication
 * 2. Attempt to delete comment from non-existent article ID
 * 3. Validate error response for invalid article identifier
 */
export async function test_api_comment_deletion_nonexistent_article(
  connection: api.IConnection,
) {
  // Create member account for authentication
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Attempt to delete comment from non-existent article
  const nonexistentArticleId = typia.random<string & tags.Format<"uuid">>();
  const nonexistentCommentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should fail to delete comment from non-existent article",
    async () => {
      await api.functional.economicDiscussion.member.articles.comments.erase(
        connection,
        {
          articleId: nonexistentArticleId,
          commentId: nonexistentCommentId,
        },
      );
    },
  );
}
