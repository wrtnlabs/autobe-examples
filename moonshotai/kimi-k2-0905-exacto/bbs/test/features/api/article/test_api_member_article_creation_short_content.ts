import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test article creation rejection for content below minimum length (10
 * characters).
 *
 * This test verifies that the economic discussion platform properly validates
 * article content length requirements. The system enforces a minimum content
 * length of 10 characters to ensure substantial discussion material and
 * maintain content quality standards for economic and political discourse.
 *
 * Test workflow:
 *
 * 1. Create a moderator account and category for article creation
 * 2. Authenticate as a member user
 * 3. Attempt to create an article with insufficient content (< 10 characters)
 * 4. Verify that the system rejects the article and provides appropriate error
 *    validation
 * 5. Create a valid article with sufficient content length
 * 6. Confirm that articles meeting minimum requirements are successfully created
 *
 * This ensures content quality standards are properly enforced while
 * maintaining a smooth user experience for legitimate content creation.
 */
export async function test_api_member_article_creation_short_content(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator account for category creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: moderatorEmail,
      password_hash: "moderator123",
      moderation_level: "standard",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Create a discussion category as moderator
  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(8),
          name: RandomGenerator.name(2),
          description: "Test category for content validation",
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch to member authentication for article creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: memberEmail,
      password: "member123",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Test 1: Attempt to create article with insufficient content length (< 10 characters)
  await TestValidator.error(
    "should reject article with content below minimum length",
    async () => {
      await api.functional.economicDiscussion.member.articles.create(
        connection,
        {
          body: {
            title: "Short Discussion",
            content: "Hi", // Only 2 characters - below 10 character minimum
            category_ids: [category.id],
          } satisfies IEconomicDiscussionArticle.ICreate,
        },
      );
    },
  );

  // Test 2: Create article with valid content length (>= 10 characters)
  const validArticleContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 3,
    wordMax: 8,
  });

  const validArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: "Economic Policy Analysis",
        content: validArticleContent,
        category_ids: [category.id],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(validArticle);

  // Verify the valid article was created successfully
  TestValidator.equals(
    "article title matches",
    validArticle.title,
    "Economic Policy Analysis",
  );
  TestValidator.predicate(
    "article content meets minimum length",
    validArticle.content.length >= 10,
  );
  TestValidator.equals(
    "article status is pending",
    validArticle.status,
    "pending",
  );
  TestValidator.equals("article version is 1.0", validArticle.version, 1);
  TestValidator.equals(
    "article view count starts at 0",
    validArticle.view_count,
    0,
  );
}
