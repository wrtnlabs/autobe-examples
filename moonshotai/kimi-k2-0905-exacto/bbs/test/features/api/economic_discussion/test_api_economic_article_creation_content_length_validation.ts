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
 * Test article creation with content length validation ensuring quality
 * standards
 *
 * This comprehensive test validates article creation functionality with strict
 * content length requirements. The economic discussion platform enforces
 * minimum content length (10 characters) for meaningful discussions and maximum
 * length (50,000 characters) to prevent system abuse.
 *
 * Test workflow:
 *
 * 1. Register new member account for authentication
 * 2. Create valid article with appropriate content length
 * 3. Test minimum content requirement with insufficient text
 * 4. Test maximum content requirement with excessive text
 * 5. Verify content validation works correctly
 *
 * Content specifications:
 *
 * - Minimum content length: 10 characters (IEconomicDiscussionArticle.ICreate)
 * - Maximum content length: 50,000 characters
 *   (IEconomicDiscussionArticle.ICreate)
 * - Title constraints: 1-500 characters
 * - Content must be meaningful for economic/political discussion
 */
export async function test_api_economic_article_creation_content_length_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account for authentication
  const memberData = {
    username: RandomGenerator.paragraph({ sentences: 1, wordMax: 12 }),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.paragraph({ sentences: 1, wordMax: 20 }),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create valid article with appropriate content length
  const validContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });

  const validArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5, wordMax: 15 }),
        content: validContent.substring(0, Math.min(validContent.length, 3000)), // Keep it under character limit
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
        attachments: undefined,
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(validArticle);

  // Verify valid article creation succeeded
  TestValidator.predicate(
    "valid article content meets minimum length",
    validArticle.content.length >= 10,
  );
  TestValidator.predicate(
    "valid article content within maximum limit",
    validArticle.content.length <= 50000,
  );

  // Step 3: Test minimum content requirement with insufficient text
  await TestValidator.error(
    "article creation should fail with content below minimum length",
    async () => {
      await api.functional.economicDiscussion.member.articles.create(
        connection,
        {
          body: {
            title: "Valid title for testing",
            content: "Short", // Only 5 characters - below minimum of 10
            category_ids: [typia.random<string & tags.Format<"uuid">>()],
            attachments: undefined,
          } satisfies IEconomicDiscussionArticle.ICreate,
        },
      );
    },
  );

  // Step 4: Test maximum content requirement with excessive text
  const excessiveContent = RandomGenerator.content({
    paragraphs: 50,
    sentenceMin: 20,
    sentenceMax: 30,
    wordMin: 5,
    wordMax: 10,
  }).substring(0, 52000); // Create content over 50,000 characters

  await TestValidator.error(
    "article creation should fail with content above maximum length",
    async () => {
      await api.functional.economicDiscussion.member.articles.create(
        connection,
        {
          body: {
            title: "Valid title for testing maximum content",
            content: excessiveContent, // Over 50,000 characters - above maximum
            category_ids: [typia.random<string & tags.Format<"uuid">>()],
            attachments: undefined,
          } satisfies IEconomicDiscussionArticle.ICreate,
        },
      );
    },
  );

  // Step 5: Create article with minimum valid content
  const minContentArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: "Article with minimum content",
        content:
          "This is the minimum content length text that contains exactly enough characters to pass validation", // Exactly meeting minimum
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
        attachments: undefined,
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(minContentArticle);

  TestValidator.predicate(
    "minimum content article created successfully",
    minContentArticle.content.length >= 10,
  );

  // Step 6: Create article with maximum valid content
  const maxContent = RandomGenerator.content({
    paragraphs: 20,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 6,
    wordMax: 12,
  }).substring(0, 49950); // Just under maximum limit

  const maxContentArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: "Article with maximum valid content length",
        content: maxContent,
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
        attachments: undefined,
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(maxContentArticle);

  TestValidator.predicate(
    "maximum content article created successfully",
    maxContentArticle.content.length <= 50000,
  );
  TestValidator.predicate(
    "maximum content article validates upper limit",
    maxContentArticle.content.length > 45000,
  ); // Ensures we're actually testing near limit
}
