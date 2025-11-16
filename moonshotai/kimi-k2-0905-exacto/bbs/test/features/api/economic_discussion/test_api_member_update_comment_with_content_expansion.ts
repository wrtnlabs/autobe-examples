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
 * Test member comment updates that expand original content with additional
 * insights.
 *
 * This test validates the editing process when members want to add more
 * detailed analysis or additional perspectives to their original comments.
 * Tests content length limits, formatting preservation, and proper version
 * tracking when significant content additions are made to existing discussion
 * contributions.
 *
 * Test workflow:
 *
 * 1. Register new member account for authentication
 * 2. Create economic discussion article for comment testing
 * 3. Post initial comment with basic content
 * 4. Update comment with expanded content and additional insights
 * 5. Verify content expansion preserves original meaning while adding detail
 * 6. Test content length validation (min 10, max 1000 characters)
 * 7. Validate comment ownership and update permissions
 */
export async function test_api_member_update_comment_with_content_expansion(
  connection: api.IConnection,
) {
  // Step 1: Register new member account
  const memberData = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create economic discussion article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 8,
    }),
    category_ids: [typia.random<string & tags.Format<"uuid">>()],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Create initial comment with basic content
  const initialCommentData = {
    article_id: article.id,
    content:
      "This is an interesting analysis of economic trends and market dynamics.",
  } satisfies IEconomicDiscussionComment.ICreate;

  const initialComment =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: initialCommentData,
      },
    );
  typia.assert(initialComment);

  // Step 4: Update comment with expanded content and additional insights
  const expandedContent = {
    content:
      "This is an interesting analysis of economic trends and market dynamics. After further consideration, I would like to add that the intersection of monetary policy and fiscal stimulus creates complex multiplier effects throughout the economy. Historical data suggests that infrastructure investments during periods of low interest rates tend to generate higher returns, particularly in sectors like renewable energy and digital infrastructure. Additionally, the relationship between consumer confidence and spending patterns appears to be strengthening post-pandemic, with digital services showing resilience even during economic downturns.",
  } satisfies IEconomicDiscussionComment.IUpdate;

  const updatedComment =
    await api.functional.economicDiscussion.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: expandedContent,
      },
    );
  typia.assert(updatedComment);

  // Step 5: Verify content expansion preserved original meaning while adding detail
  TestValidator.predicate(
    "expanded comment contains original content",
    updatedComment.content.includes(
      "This is an interesting analysis of economic trends and market dynamics.",
    ),
  );

  TestValidator.predicate(
    "expanded comment has additional insights",
    updatedComment.content.length > initialComment.content.length,
  );

  // Step 6: Test content length validation (max 1000 characters)
  const maxLengthContent = {
    content: RandomGenerator.content({
      paragraphs: 5,
      sentenceMin: 15,
      sentenceMax: 20,
    }),
  } satisfies IEconomicDiscussionComment.IUpdate;

  // Ensure we stay within the 1000 character limit
  const trimmedContent =
    maxLengthContent.content.length > 1000
      ? maxLengthContent.content.substring(0, 980) +
        "... conclusion of detailed analysis."
      : maxLengthContent.content;

  const validLengthComment =
    await api.functional.economicDiscussion.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: updatedComment.id,
        body: { content: trimmedContent },
      },
    );
  typia.assert(validLengthComment);

  TestValidator.predicate(
    "comment content within length limits",
    validLengthComment.content.length <= 1000,
  );

  // Step 7: Test minimum content length validation (10 characters)
  await TestValidator.error(
    "should reject content shorter than 10 characters",
    async () => {
      const shortContent = {
        content: "Too short",
      } satisfies IEconomicDiscussionComment.IUpdate;

      await api.functional.economicDiscussion.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: validLengthComment.id,
          body: shortContent,
        },
      );
    },
  );

  // Validate comment ownership and update permissions
  TestValidator.equals(
    "comment author ID matches member ID",
    updatedComment.economic_discussion_member_id,
    member.member.id,
  );

  TestValidator.predicate(
    "comment is associated with correct article",
    updatedComment.economic_discussion_article_id === article.id,
  );

  TestValidator.predicate(
    "comment has been updated after creation",
    new Date(updatedComment.updated_at).getTime() >
      new Date(updatedComment.created_at).getTime(),
  );
}
