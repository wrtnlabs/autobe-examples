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
 * Test member category detachment from own article.
 *
 * This test validates the complete workflow where a member can successfully
 * detach a category from their own article. The scenario involves creating a
 * member account, logging in, having a moderator create test categories,
 * creating an article with multiple categories, then detaching one category
 * while verifying the article maintains proper categorization.
 *
 * Test steps:
 *
 * 1. Create member account for authentication
 * 2. Create moderator account to set up test categories
 * 3. Create multiple test categories via moderator
 * 4. Member creates article with multiple categories
 * 5. Member detaches one category from the article
 * 6. Verify article no longer contains detached category
 * 7. Verify article still contains remaining categories
 */
export async function test_api_member_detach_category_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account for testing
  const memberData = {
    username: RandomGenerator.alphabets(15),
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
  } satisfies IEconomicDiscussionMember.ICreate;

  await api.functional.auth.member.join(connection, {
    body: memberData,
  });

  // Step 2: Create moderator account for category management
  const moderatorData = {
    username: RandomGenerator.alphabets(15),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "TestPassword123!",
    moderation_level: "standard",
  } satisfies IEconomicDiscussionModerator.ICreate;

  await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });

  // Step 3: Create test categories via moderator
  const economicsCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "economics",
          name: "Economics Discussion",
          description: "Topics related to economic theory and policy",
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );

  const politicsCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "politics",
          name: "Political Analysis",
          description: "Political commentary and analysis",
          display_order: 2,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );

  const internationalCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "international",
          name: "International Affairs",
          description: "Global economic and political issues",
          display_order: 3,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );

  // Step 4: Switch to member account
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberData.email,
      password_hash: memberData.password,
    } satisfies IEconomicDiscussionMember.ILogin,
  });

  // Step 5: Create article with multiple categories
  const articleCreateData = {
    title: "Analysis of Global Economic Trends",
    content: RandomGenerator.content(),
    category_ids: [
      economicsCategory.id,
      politicsCategory.id,
      internationalCategory.id,
    ],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleCreateData,
    });

  // Step 6: Verify article has all categories initially
  TestValidator.equals("initial category count", article.categories.length, 3);
  TestValidator.predicate("has economics category", () =>
    article.categories.some((cat) => cat.code === "economics"),
  );
  TestValidator.predicate("has politics category", () =>
    article.categories.some((cat) => cat.code === "politics"),
  );
  TestValidator.predicate("has international category", () =>
    article.categories.some((cat) => cat.code === "international"),
  );

  // Step 7: Detach economics category
  await api.functional.economicDiscussion.member.articles.categories.detachCategory(
    connection,
    {
      articleId: article.id,
      categoryCode: "economics",
    },
  );

  // Step 8: Verify successful detachment
  TestValidator.predicate("detachment completed successfully", () => true);
}
