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
 * Test successful article update workflow where members can modify their own
 * content within permitted editing windows.
 *
 * This comprehensive test validates the complete update process from initial
 * article creation through content modification including title changes,
 * content refinement, and version tracking. Ensures that members of the
 * economic discussion platform can improve their economic analysis while
 * maintaining proper version history and moderation oversight for content
 * quality assurance.
 *
 * The test executes:
 *
 * 1. Member registration to establish authentication context
 * 2. Initial article creation with economic discussion content
 * 3. Article update with improved title and refined analysis
 * 4. Validation of version history tracking and updated metadata
 *
 * This workflow mirrors real member engagement in economic and political
 * discussion communities where users enhance their analyses based on feedback
 * or new information.
 */
export async function test_api_member_article_update_successful(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account with economic community data
  const memberData = {
    username: RandomGenerator.name()
      .replace(/\s+/g, "_")
      .toLowerCase()
      .slice(0, 25),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const registeredMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(registeredMember);
  TestValidator.equals(
    "member registration succeeded",
    registeredMember.member.username,
    memberData.username,
  );

  // Step 2: Create categories for the economic discussion
  const categoryIds = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];

  // Step 3: Create initial economic discussion article
  const createBody = {
    title: (RandomGenerator.paragraph() + " Economic Analysis").slice(0, 500),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }) satisfies IEconomicDiscussionArticle.ICreate["content"],
    category_ids: categoryIds,
  } satisfies IEconomicDiscussionArticle.ICreate;

  const createdArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: createBody,
    });
  typia.assert(createdArticle);
  TestValidator.equals(
    "initial article created",
    createdArticle.title,
    createBody.title,
  );

  // Step 4: Wait a moment to simulate real editing delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 5: Update the article with refined analysis
  const updateBody = {
    title: createdArticle.title + " - Enhanced Analysis",
    content:
      createdArticle.content +
      "\n\n## Updated Analysis\n\n" +
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 6,
        sentenceMax: 12,
        wordMin: 5,
        wordMax: 9,
      }) +
      "\n\nThis updated perspective reflects recent economic developments and community feedback.",
  } satisfies IEconomicDiscussionArticle.IUpdate;

  const updatedArticle =
    await api.functional.economicDiscussion.member.articles.update(connection, {
      articleId: createdArticle.id,
      body: updateBody,
    });
  typia.assert(updatedArticle);

  // Step 6: Validation of successful update
  TestValidator.equals(
    "article title updated",
    updatedArticle.title,
    updateBody.title,
  );
  TestValidator.equals(
    "article content updated",
    updatedArticle.content,
    updateBody.content,
  );
  TestValidator.equals(
    "IDs remain the same",
    updatedArticle.id,
    createdArticle.id,
  );
  TestValidator.predicate(
    "version incremented by editing",
    () => updatedArticle.version > createdArticle.version,
  );
  TestValidator.predicate(
    "updated_at more recent than created_at",
    () =>
      new Date(updatedArticle.updated_at) > new Date(createdArticle.created_at),
  );
  TestValidator.equals(
    "member author maintained",
    updatedArticle.member_author,
    createdArticle.member_author,
  );
  TestValidator.equals(
    "categories preserved",
    updatedArticle.categories.length,
    2,
  );
  TestValidator.equals(
    "status maintains pending for moderation",
    updatedArticle.status,
    "pending",
  );
}
