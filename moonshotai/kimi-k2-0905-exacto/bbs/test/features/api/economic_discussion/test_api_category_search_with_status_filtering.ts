import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionArticle";

export async function test_api_category_search_with_status_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: moderatorEmail,
      password_hash: "moderator123",
      moderation_level: "standard",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create discussion category
  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(8),
          name: "Economic Policy Discussion",
          description: "Discussion of economic policies and their impacts",
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for article creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: memberEmail,
      password: "member123",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create articles for testing
  const articleData1 = {
    title: "Impact of Interest Rate Changes",
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_ids: [category.id],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const articleData2 = {
    title: "Fiscal Policy Analysis",
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_ids: [category.id],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article1 =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData1,
    });
  typia.assert(article1);

  const article2 =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData2,
    });
  typia.assert(article2);

  // Step 5: Test category search with status filter matching actual created articles
  const searchResults =
    await api.functional.economicDiscussion.member.search.categories.index(
      connection,
      {
        categoryCode: category.code,
        body: {
          page: 1,
          limit: 10,
          status: article1.status, // Use actual status of created articles
        } satisfies IEconomicDiscussionArticle.IRequest,
      },
    );
  typia.assert(searchResults);

  // Step 6: Verify search results
  TestValidator.predicate(
    "search results should contain articles",
    searchResults.data.length > 0,
  );

  // All returned articles should have the filtered status and be in the category
  searchResults.data.forEach((article, index) => {
    TestValidator.equals(
      `article ${index + 1} status should match filter`,
      article.status,
      article1.status,
    );
    TestValidator.predicate(
      `article ${index + 1} should be in the category`,
      article.categories.some((cat) => cat.id === category.id),
    );
  });

  // Test with no status filter (should return all articles in category)
  const allSearch =
    await api.functional.economicDiscussion.member.search.categories.index(
      connection,
      {
        categoryCode: category.code,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEconomicDiscussionArticle.IRequest,
      },
    );
  typia.assert(allSearch);

  TestValidator.predicate(
    "search without status filter should return all articles",
    allSearch.data.length >= 2,
  );
  TestValidator.predicate(
    "all returned articles should be in the category",
    allSearch.data.every((article) =>
      article.categories.some((cat) => cat.id === category.id),
    ),
  );

  // Test searching non-existent category returns empty results
  const invalidCategorySearch =
    await api.functional.economicDiscussion.member.search.categories.index(
      connection,
      {
        categoryCode: "non-existent-category",
        body: {
          page: 1,
          limit: 10,
        } satisfies IEconomicDiscussionArticle.IRequest,
      },
    );
  typia.assert(invalidCategorySearch);

  TestValidator.equals(
    "invalid category should return empty results",
    invalidCategorySearch.data.length,
    0,
  );
}
