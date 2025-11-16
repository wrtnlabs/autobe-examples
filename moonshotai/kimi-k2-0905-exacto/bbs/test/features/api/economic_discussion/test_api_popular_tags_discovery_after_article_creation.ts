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
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import type { IEconomicDiscussionPopularTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionPopularTag";
import type { IEconomicDiscussionPopularTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionPopularTags";

/**
 * Test popular tags discovery workflow after creating articles and categories.
 *
 * This comprehensive test validates the entire tag popularity ecosystem where
 * categories function as tags, articles are assigned to categories, and the
 * discovery endpoint surfaces the most trending topics based on article usage
 * patterns.
 *
 * The test follows this complete business flow:
 *
 * 1. Create moderator account with administrative privileges
 * 2. Create multiple economic discussion categories (these become our tags)
 * 3. Create numerous articles assigned to these categories to build usage
 *    statistics
 * 4. Retrieve popular tags through the discovery endpoint
 * 5. Validate that tag popularity correctly reflects article distribution
 * 6. Verify trending scores and metadata for content discoverability
 */
export async function test_api_popular_tags_discovery_after_article_creation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for administrative access
  const moderatorData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    moderation_level: "standard",
    email_verified: true,
    two_factor_enabled: false,
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create multiple economic discussion categories that will become our tags
  const categories = await ArrayUtil.asyncRepeat(5, async (index) => {
    const categoryData = {
      code: `category_${index + 1}_${RandomGenerator.alphabets(3)}`,
      name: RandomGenerator.name(2),
      description: RandomGenerator.paragraph({ sentences: 8 }),
      display_order: index + 1,
      is_active: true,
    } satisfies IEconomicDiscussionCategory.ICreate;

    return await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  });

  // Step 3: Create articles in varying distribution across categories to generate usage statistics
  const articles = await ArrayUtil.asyncRepeat(15, async () => {
    const randomCategories = RandomGenerator.sample(
      categories.map((category) => category.id),
      RandomGenerator.pick([1, 2, 3]), // Articles may have 1-3 categories
    );

    const articleData = {
      title: RandomGenerator.name(4),
      content: RandomGenerator.content({
        paragraphs: RandomGenerator.pick([2, 3, 4, 5]),
        sentenceMin: 8,
        sentenceMax: 15,
        wordMin: 4,
        wordMax: 8,
      }),
      category_ids: randomCategories,
      attachments: RandomGenerator.pick([[], [], []]), // Most articles have no attachments
    } satisfies IEconomicDiscussionArticle.ICreate;

    return await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: articleData,
      },
    );
  });

  // Step 4: Retrieve popular tags from the discovery endpoint
  const popularTagsResponse =
    await api.functional.economicDiscussion.discovery.popular_tags.popularTags(
      connection,
    );
  typia.assert(popularTagsResponse);

  // Step 5: Validate that popular tags are returned in correct order and format
  TestValidator.predicate(
    "popular tags response has tags array",
    popularTagsResponse.tags.length > 0,
  );

  // Each tag should have all required fields
  popularTagsResponse.tags.forEach(
    (tag: IEconomicDiscussionPopularTag, index: number) => {
      typia.assert(tag);

      // Validate tag has valid UUID format ID
      TestValidator.predicate(
        `tag ${index} has valid ID format`,
        typeof tag.id === "string" && tag.id.length > 0,
      );

      TestValidator.predicate(`tag ${index} has name`, tag.name.length > 0);
      TestValidator.predicate(
        `tag ${index} has display name`,
        tag.displayName.length > 0,
      );
      TestValidator.predicate(
        `tag ${index} has non-negative article count`,
        tag.articleCount >= 0 && Number.isInteger(tag.articleCount),
      );
      TestValidator.predicate(
        `tag ${index} has non-negative trending score`,
        tag.trendingScore >= 0,
      );
      TestValidator.predicate(
        `tag ${index} has valid creation timestamp`,
        typeof tag.createdAt === "string" && tag.createdAt.length > 0,
      );
      TestValidator.predicate(
        `tag ${index} has valid last used timestamp`,
        typeof tag.lastUsedAt === "string" && tag.lastUsedAt.length > 0,
      );
    },
  );

  // Step 6: Validate category popularity metrics by counting articles
  const categoryUsageCount = new Map<string, number>();

  // Count how many articles use each category
  articles.forEach((article) => {
    article.categories.forEach((category) => {
      const currentCount = categoryUsageCount.get(category.id) || 0;
      categoryUsageCount.set(category.id, currentCount + 1);
    });
  });

  // Sort categories by usage count (descending) for comparison
  const expectedPopularOrder = Array.from(categoryUsageCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => categories.find((cat) => cat.id === id))
    .filter(Boolean) as IEconomicDiscussionCategory[];

  // Filter out unused categories and limit to actual popular tags returned
  const expectedTopTags = expectedPopularOrder.slice(
    0,
    Math.min(expectedPopularOrder.length, popularTagsResponse.tags.length),
  );

  // Compare expected order with discovered popular tags
  TestValidator.predicate(
    "popular tags match expected usage-based ordering",
    expectedTopTags.every((expectedCategory, index) => {
      if (!expectedCategory || index >= popularTagsResponse.tags.length)
        return false;

      const popularTag = popularTagsResponse.tags[index];
      return (
        popularTag.id === expectedCategory.id &&
        popularTag.name === expectedCategory.name &&
        popularTag.displayName === expectedCategory.name
      );
    }),
  );

  // Validate that the most popular tag has the highest count
  if (popularTagsResponse.tags.length > 0 && expectedTopTags.length > 0) {
    const mostPopularTag = popularTagsResponse.tags[0];
    const expectedMostPopularCount =
      categoryUsageCount.get(expectedTopTags[0]!.id) || 0;

    TestValidator.equals(
      "most popular tag has correct article count",
      mostPopularTag.articleCount,
      expectedMostPopularCount,
    );
  }

  // Validate trending content provision
  TestValidator.predicate(
    "popular tags provide meaningful trending content",
    popularTagsResponse.tags.filter((tag) => tag.articleCount > 0).length > 0,
  );

  TestValidator.predicate(
    "discovery system returns expected count of popular tags",
    popularTagsResponse.tags.length >=
      Math.min(expectedPopularOrder.length, 10),
  );

  // Step 7: Validate that the system effectively manages trending content
  TestValidator.predicate(
    "trending scores reflect relative popularity",
    popularTagsResponse.tags.every((tag, index, array) => {
      if (index === 0) return true; // First tag is always valid
      // Trending scores should generally decrease or stay level as we go down the list
      return array[index - 1]!.trendingScore >= tag.trendingScore;
    }),
  );
}
