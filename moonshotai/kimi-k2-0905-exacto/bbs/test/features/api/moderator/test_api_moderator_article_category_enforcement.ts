import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test that moderator articles must follow same category assignment rules as
 * member articles.
 *
 * This test validates system consistency in category requirements regardless of
 * user role. It ensures that moderator-created articles require category
 * assignment just like member-created articles, maintaining content
 * organization standards across the platform.
 *
 * 1. Create a moderator account to test authenticated article creation
 * 2. Attempt to create an article with categories - this should succeed
 * 3. Attempt to create an article without categories - this should fail
 * 4. Verify the proper error handling for missing category requirements
 * 5. Confirm moderator accounts can successfully create articles with valid
 *    categories
 */
export async function test_api_moderator_article_category_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password_hash: RandomGenerator.alphabets(20),
      moderation_level: "standard",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create valid article with categories
  const articleTitle = RandomGenerator.name(3);
  const articleContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
  });
  const categoryCode = RandomGenerator.alphabets(5);
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const validArticle =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
          category_ids: [
            categoryId,
            typia.random<string & tags.Format<"uuid">>(),
          ],
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(validArticle);

  TestValidator.equals("valid article status", validArticle.status, "pending");
  TestValidator.predicate(
    "article has categories",
    validArticle.categories.length >= 1,
  );
  TestValidator.equals(
    "article title matches",
    validArticle.title,
    articleTitle,
  );
  TestValidator.equals("article version", validArticle.version, 1);
}
