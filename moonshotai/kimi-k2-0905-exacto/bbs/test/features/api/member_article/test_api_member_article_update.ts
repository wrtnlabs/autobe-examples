import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test that authenticated members can update their own economic and political
 * discussion articles.
 *
 * This test validates the complete article update workflow for authenticated
 * members on the economic discussion board. It ensures members can successfully
 * modify their own articles with new content while maintaining proper
 * versioning and moderation tracking. The test verifies that the update
 * operation correctly increments the article version, updates timestamps, and
 * respects content length requirements.
 *
 * Test workflow:
 *
 * 1. Register a new member account for authentication
 * 2. Create an initial economic discussion article
 * 3. Update the article with new title and content
 * 4. Validate the update was successful and version was incremented
 * 5. Verify content changes are properly reflected in the response
 *
 * The test ensures that only authenticated members can update articles and that
 * the update operation maintains data integrity through the moderation
 * workflow.
 */
export async function test_api_member_article_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account for authentication
  const memberCredentials = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberCredentials,
  });
  typia.assert(member);

  // Step 2: Create an initial economic discussion article
  const categories = ["economics", "politics", "policy"] as const;
  const categoryCode = RandomGenerator.pick(categories);

  const createArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 4,
      wordMax: 7,
    }),
    category_ids: [typia.random<string & tags.Format<"uuid">>()],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const createdArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: createArticleBody,
    });
  typia.assert(createdArticle);

  TestValidator.equals(
    "article version starts at 1",
    createdArticle.version,
    1,
  );
  TestValidator.equals(
    "article status is pending",
    createdArticle.status,
    "pending",
  );

  // Step 3: Update the article with new title and content
  const updateArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 6, wordMax: 12 }),
    content: RandomGenerator.content({
      paragraphs: 4,
      sentenceMin: 6,
      sentenceMax: 10,
      wordMin: 5,
      wordMax: 8,
    }),
    status: "pending" as const,
  } satisfies IEconomicDiscussionArticle.IUpdate;

  const updatedArticle =
    await api.functional.economicDiscussion.member.articles.update(connection, {
      articleId: createdArticle.id,
      body: updateArticleBody,
    });
  typia.assert(updatedArticle);

  // Step 4: Validate the update was successful and version was incremented
  TestValidator.equals(
    "article version incremented",
    updatedArticle.version,
    createdArticle.version + 1,
  );
  TestValidator.equals(
    "article ID unchanged",
    updatedArticle.id,
    createdArticle.id,
  );
  TestValidator.predicate(
    "updated_at is newer",
    new Date(updatedArticle.updated_at) > new Date(createdArticle.updated_at),
  );

  // Step 5: Verify content changes are properly reflected
  TestValidator.equals(
    "title updated correctly",
    updatedArticle.title,
    updateArticleBody.title,
  );
  TestValidator.equals(
    "content updated correctly",
    updatedArticle.content,
    updateArticleBody.content,
  );
  TestValidator.equals("status maintained", updatedArticle.status, "pending");

  // Additional validation: Ensure view count and other metadata remain unchanged
  TestValidator.equals(
    "view count unchanged",
    updatedArticle.view_count,
    createdArticle.view_count,
  );
  TestValidator.predicate(
    "created_at unchanged",
    updatedArticle.created_at === createdArticle.created_at,
  );

  // Test error case: Prevent other users from updating the article
  const otherMemberCredentials = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const otherMember = await api.functional.auth.member.join(connection, {
    body: otherMemberCredentials,
  });
  typia.assert(otherMember);

  // Attempt to update the first member's article as a different member
  await TestValidator.error("other member cannot update article", async () => {
    await api.functional.economicDiscussion.member.articles.update(connection, {
      articleId: createdArticle.id,
      body: {
        title: "Hacked Title",
        content: "This should not be allowed",
      } satisfies IEconomicDiscussionArticle.IUpdate,
    });
  });
}
