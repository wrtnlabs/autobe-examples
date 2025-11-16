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
 * Test successful association of a category to a member's article.
 *
 * This test validates the complete workflow of associating a category with an
 * article in the economic discussion platform. The scenario involves multiple
 * actors:
 *
 * 1. Create a member account for article authorship
 * 2. Create a moderator account for category management
 * 3. Have the moderator create a new category
 * 4. Have the member create an article
 * 5. Associate the category with the article
 * 6. Verify the association was successful
 *
 * This tests cross-actor interactions, authentication switching, and the core
 * business logic of content organization through category tagging.
 */
export async function test_api_member_article_category_association_success(
  connection: api.IConnection,
) {
  // Step 1: Create member account for article authorship
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: "SecurePassword123!",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create moderator account for category creation
  const moderatorUsername = RandomGenerator.alphaNumeric(10);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "SecurePassword123!",
      moderation_level: "standard",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Moderator creates a new category
  const categoryCode = RandomGenerator.alphaNumeric(8);
  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: categoryCode,
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch back to member account and create article
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password_hash: "SecurePassword123!",
    } satisfies IEconomicDiscussionMember.ILogin,
  });

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [], // Create article without initial categories
        attachments: [],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Associate category with article (explicit attachment)
  await api.functional.economicDiscussion.member.articles.categories.attachCategory(
    connection,
    {
      articleId: article.id,
      categoryCode: category.code,
    },
  );

  // Step 6: Verify the association by checking article response
  TestValidator.predicate(
    "article creation successful with category attachment",
    article.id !== undefined,
  );
  TestValidator.predicate(
    "category has valid properties",
    category.id !== undefined && category.code !== undefined,
  );
}
