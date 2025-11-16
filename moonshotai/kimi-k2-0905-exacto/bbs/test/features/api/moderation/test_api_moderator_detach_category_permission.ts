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
 * Test moderator category detachment on member-authored articles. A member
 * creates an article and assigns categories. A moderator then detaches
 * categories as administrative action. Validates moderator permissions to
 * reorganize community content regardless of original author.
 *
 * Step-by-step process:
 *
 * 1. Member creates account and authenticates
 * 2. Member creates test categories for article assignment
 * 3. Member creates article with assigned categories
 * 4. Moderator creates account and authenticates
 * 5. Moderator detaches category from member's article
 */
export async function test_api_moderator_detach_category_permission(
  connection: api.IConnection,
) {
  // Member creates account and authenticates
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(15),
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Create test categories for article assignment
  const category1 = String(RandomGenerator.alphabets(10));
  const category2 = String(RandomGenerator.alphabets(10));

  // Create first category
  const cat1 =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: category1,
          name: RandomGenerator.name(2),
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(cat1);

  // Create second category
  const cat2 =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: category2,
          name: RandomGenerator.name(2),
          display_order: 2,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(cat2);

  // Member creates article with assigned categories
  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [cat1.id, cat2.id],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Verify article has both categories
  TestValidator.equals(
    "article has both categories",
    article.categories.length,
    2,
  );
  TestValidator.predicate("categories include cat1", () =>
    article.categories.some((c) => c.code === category1),
  );
  TestValidator.predicate("categories include cat2", () =>
    article.categories.some((c) => c.code === category2),
  );

  // Moderator creates account and authenticates
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphabets(15),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(12),
      moderation_level: "admin",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Moderator detaches one category from member's article
  await api.functional.economicDiscussion.moderator.articles.categories.detachCategory(
    connection,
    {
      articleId: article.id,
      categoryCode: category1,
    },
  );

  // Test validates that moderators can detach categories from member articles
  // demonstrating administrative permissions to reorganize community content
}
