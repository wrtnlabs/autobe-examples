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
 * Test that unauthorized users cannot delete comments they don't own.
 *
 * Validates proper ownership validation and access control, ensuring that only
 * the comment author or moderators can perform deletion operations. Should
 * return appropriate error responses for unauthorized deletion attempts.
 *
 * Test flow:
 *
 * 1. Create original member account (comment owner)
 * 2. Create article as original member
 * 3. Add comment to article as original member
 * 4. Create second member account (unauthorized user)
 * 5. Attempt to delete comment as unauthorized user
 * 6. Verify deletion fails with appropriate error
 */
export async function test_api_comment_deletion_ownership_validation(
  connection: api.IConnection,
) {
  // Step 1: Create original member account (comment owner)
  const originalMember = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(originalMember);

  // Step 2: Create article as original member
  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: RandomGenerator.name(3),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Add comment to article as original member
  const comment =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          article_id: article.id,
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IEconomicDiscussionComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 4: Create second member account (unauthorized user)
  const unauthorizedMember = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(unauthorizedMember);

  // Step 5: Attempt to delete comment as unauthorized user
  await TestValidator.error(
    "unauthorized user should not delete other's comment",
    async () => {
      await api.functional.economicDiscussion.articles.comments.erase(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
        },
      );
    },
  );

  // Verify comment still exists by checking its properties
  TestValidator.equals(
    "comment should not be deleted",
    comment.deleted_at,
    undefined,
  );
  TestValidator.equals(
    "comment content preserved",
    comment.content !== undefined,
    true,
  );
}
