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
 * Test error handling when attempting to retrieve a comment that does not
 * exist. This scenario ensures the system properly handles invalid comment IDs
 * and returns appropriate error responses. Tests verify that non-existent
 * comment retrieval attempts are rejected with clear error messages while
 * maintaining system security and preventing information leakage.
 */
export async function test_api_comment_retrieval_comment_not_found(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication context
  const memberData = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create an article to provide valid article context
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 4,
      wordMax: 7,
    }),
    category_ids: ArrayUtil.repeat<string & tags.Format<"uuid">>(
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<3>
      >(),
      () => typia.random<string & tags.Format<"uuid">>(),
    ),
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Generate random non-existent comment ID
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Attempt to retrieve non-existent comment and verify error handling
  await TestValidator.error(
    "non-existent comment retrieval should fail",
    async () => {
      await api.functional.economicDiscussion.member.articles.comments.at(
        connection,
        {
          articleId: article.id,
          commentId: nonExistentCommentId,
        },
      );
    },
  );
}
