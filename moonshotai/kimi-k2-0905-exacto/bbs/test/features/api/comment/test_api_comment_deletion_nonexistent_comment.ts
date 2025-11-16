import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test deleting a comment that doesn't exist on a valid article. Validates that
 * attempting to delete a non-existent comment returns appropriate 404 error.
 *
 * Steps:
 *
 * 1. Register a new member
 * 2. Create an economic discussion article
 * 3. Attempt to delete a non-existent comment on the article
 * 4. Verify that the operation fails with appropriate error
 */
export async function test_api_comment_deletion_nonexistent_comment(
  connection: api.IConnection,
) {
  // Step 1: Register a new member
  const memberData = {
    username: RandomGenerator.name(1)
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .substring(0, 30),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create an economic discussion article
  const categories = ["economics", "politics", "policy"];
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 15 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 8,
    }),
    category_ids: ArrayUtil.repeat(2, () =>
      typia.random<string & tags.Format<"uuid">>(),
    ),
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Attempt to delete a non-existent comment
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Verify that the operation fails with appropriate error
  await TestValidator.error(
    "should fail when deleting non-existent comment",
    async () => {
      await api.functional.economicDiscussion.member.articles.comments.erase(
        connection,
        {
          articleId: article.id,
          commentId: nonExistentCommentId,
        },
      );
    },
  );
}
