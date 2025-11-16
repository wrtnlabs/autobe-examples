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
 * Test deleting the same comment twice.
 *
 * This test validates the soft deletion behavior of comments in the economic
 * discussion platform. It ensures that attempting to delete an already deleted
 * comment returns appropriate error while preserving the audit trail through
 * soft deletion tracking. The test creates a complete workflow: member
 * registration, article creation, comment creation, initial deletion, and
 * attempted second deletion which should fail appropriately.
 */
export async function test_api_comment_deletion_twice(
  connection: api.IConnection,
) {
  // Register a new member to create content
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(memberAuth);

  // Create an economic discussion article
  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: RandomGenerator.name(3),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_ids: ArrayUtil.repeat(1, () =>
          typia.random<string & tags.Format<"uuid">>(),
        ),
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Create a comment on the article
  const comment =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          article_id: article.id,
        } satisfies IEconomicDiscussionComment.ICreate,
      },
    );
  typia.assert(comment);

  // Verify comment is initially active (no deletion timestamp)
  TestValidator.equals(
    "comment initially has no deletion timestamp",
    comment.deleted_at,
    undefined,
  );

  // Delete the comment for the first time - this should succeed
  const firstDeletion =
    await api.functional.economicDiscussion.member.articles.comments.erase(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(firstDeletion);

  // Verify the comment now has a deletion timestamp (soft deleted)
  TestValidator.predicate(
    "first deletion adds deletion timestamp",
    firstDeletion.deleted_at !== undefined,
  );
  TestValidator.equals(
    "first deletion comment ID matches original",
    firstDeletion.id,
    comment.id,
  );

  // Attempt to delete the same comment again - this should fail with appropriate error
  await TestValidator.error("second deletion attempt should fail", async () => {
    await api.functional.economicDiscussion.member.articles.comments.erase(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  });
}
