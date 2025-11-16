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
 * Test comment update with content exceeding 1000 character limit.
 *
 * This test validates the maximum length validation for comment updates on the
 * economic discussion platform. It ensures that comments cannot exceed the 1000
 * character limit when being updated, maintaining content quality and system
 * performance standards.
 *
 * Test workflow:
 *
 * 1. Register as a new member to establish authenticated session
 * 2. Create an economic discussion article for comment context
 * 3. Create a valid initial comment on the article
 * 4. Attempt to update the comment with excessive content (over 1000 characters)
 * 5. Verify the system properly rejects the oversized comment update
 */
export async function test_api_comment_update_excessive_length(
  connection: api.IConnection,
): Promise<void> {
  // Register as new member to establish authentication
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(memberAuth);

  // Create article for comment context
  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Create initial valid comment
  const comment =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          article_id: article.id,
        } satisfies IEconomicDiscussionComment.ICreate,
      },
    );
  typia.assert(comment);

  // Generate excessive content over 1000 characters
  const excessiveContent = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 25,
    sentenceMax: 35,
    wordMin: 6,
    wordMax: 10,
  });

  // Verify content exceeds 1000 characters
  TestValidator.predicate(
    "excessive content should exceed 1000 characters",
    excessiveContent.length > 1000,
  );

  // TestValidator.error accepts title as first parameter
  await TestValidator.error(
    "excessive comment content should fail validation",
    async () => {
      await api.functional.economicDiscussion.member.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            content: excessiveContent,
          } satisfies IEconomicDiscussionComment.IUpdate,
        },
      );
    },
  );
}
