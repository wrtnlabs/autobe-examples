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
 * Test that a member cannot delete another member's comment.
 *
 * This test validates authorization boundaries in the economic discussion
 * platform by ensuring that members can only delete comments they created
 * themselves, preventing unauthorized deletion of other members'
 * contributions.
 *
 * The test creates two separate member accounts, has the first member create a
 * comment on an article, then attempts deletion from the second member account
 * to verify proper access control enforcement.
 */
export async function test_api_comment_deletion_different_author(
  connection: api.IConnection,
) {
  // Create first member who will create the comment
  const firstMemberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const firstMember: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: firstMemberEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IEconomicDiscussionMember.ICreate,
    });
  typia.assert(firstMember);

  // Create an article with the first member
  const article: IEconomicDiscussionArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: "Economic Policy Analysis",
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Create a comment with the first member
  const comment: IEconomicDiscussionComment =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          article_id: article.id,
          content:
            "This is a thoughtful analysis of current economic trends and their implications.",
        } satisfies IEconomicDiscussionComment.ICreate,
      },
    );
  typia.assert(comment);

  // Create second member connection (fresh, unauthenticated)
  const secondMemberConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Create second member who will attempt unauthorized deletion
  const secondMemberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  await api.functional.auth.member.join(secondMemberConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: secondMemberEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicDiscussionMember.ICreate,
  });

  // Attempt to delete the first member's comment from the second member account
  // This should fail with authorization error since second member doesn't own the comment
  await TestValidator.error(
    "second member should not be able to delete another member's comment",
    async () => {
      await api.functional.economicDiscussion.member.articles.comments.erase(
        secondMemberConnection,
        {
          articleId: article.id,
          commentId: comment.id,
        },
      );
    },
  );
}
