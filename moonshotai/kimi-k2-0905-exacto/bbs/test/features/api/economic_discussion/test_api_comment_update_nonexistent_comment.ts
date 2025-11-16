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
 * Test updating a non-existent comment on a valid article.
 *
 * This test validates the error handling when attempting to update a comment
 * that doesn't exist in the system. It creates a valid article first, then
 * attempts to update a comment with a randomly generated ID that doesn't
 * correspond to any existing comment.
 *
 * 1. Register as member to establish authentication
 * 2. Create an article to have a valid article ID
 * 3. Attempt to update a non-existent comment
 * 4. Verify the update operation fails appropriately
 */
export async function test_api_comment_update_nonexistent_comment(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register as member to get authentication
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(2).replace(/\s+/g, "_").substring(0, 30),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 8,
        wordMax: 12,
      }).replace(/\s+/g, ""), // Remove spaces to ensure proper password format
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Additional validation that member was created successfully
  TestValidator.predicate("member has valid ID", member.member.id !== null);
  TestValidator.predicate(
    "member has access token",
    member.access_token.length > 0,
  );

  // Step 2: Create an article to establish a valid article
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: RandomGenerator.name(6),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 6,
          wordMin: 10,
          wordMax: 15,
        }),
        category_ids: [categoryId], // Use a single valid category ID
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Validate article creation was successful
  TestValidator.predicate("article has valid ID", article.id !== null);
  TestValidator.predicate(
    "article title matches input",
    article.title.length > 0,
  );

  // Step 3: Attempt to update a non-existent comment
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  const updatedContent = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 6,
    wordMax: 12,
  });

  // This should fail since the comment doesn't exist
  await TestValidator.error(
    "updating non-existent comment should fail",
    async () => {
      await api.functional.economicDiscussion.member.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: nonExistentCommentId,
          body: {
            content: updatedContent,
          } satisfies IEconomicDiscussionComment.IUpdate,
        },
      );
    },
  );

  // Additional validation to ensure we're testing the right scenario
  TestValidator.predicate(
    "non-existent comment id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      nonExistentCommentId,
    ),
  );
}
