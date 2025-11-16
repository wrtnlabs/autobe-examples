import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";

/**
 * Test updating comment on non-existent article.
 *
 * This test validates that the API properly handles attempts to update a
 * comment when the target article doesn't exist in the system. It verifies
 * error handling mechanisms in place for invalid article references.
 *
 * Test flow:
 *
 * 1. Register a new member to obtain authentication credentials
 * 2. Use non-existent article ID and random comment ID
 * 3. Attempt to update comment on the non-existent article
 * 4. Verify the API responds with appropriate error handling
 */
export async function test_api_comment_update_nonexistent_article(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a member
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: "ValidPassword123",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Use non-existent article ID and comment ID
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();

  const commentUpdateData = {
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IEconomicDiscussionComment.IUpdate;

  // Step 3: Attempt to update comment on non-existent article
  await TestValidator.error(
    "should fail when updating comment on non-existent article",
    async () => {
      await api.functional.economicDiscussion.member.articles.comments.update(
        connection,
        {
          articleId: nonExistentArticleId,
          commentId: nonExistentCommentId,
          body: commentUpdateData,
        },
      );
    },
  );
}
