import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article discovery when articles have multiple tags applied.
 *
 * This test validates that searching by one tag returns articles that may have
 * additional tags as well, verifying the many-to-many relationship between
 * articles and tags.
 *
 * Workflow steps:
 *
 * 1. Authenticate as moderator to create multiple tags and categories
 * 2. Create several tags (e.g., 'monetary-policy', 'economic-analysis',
 *    'federal-reserve')
 * 3. Create required categories
 * 4. Authenticate as member
 * 5. Create articles with multiple tag combinations
 * 6. Search articles by one specific tag
 * 7. Verify returned articles may have additional tags beyond the search tag
 * 8. Validate that all returned articles include the searched tag
 * 9. Test that article metadata includes all tags for each article
 */
export async function test_api_tag_article_search_with_multiple_tags(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create multiple tags
  const tag1 = await api.functional.discussionBoard.moderator.tags.create(
    connection,
    {
      body: {
        name: "monetary-policy",
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag1);

  const tag2 = await api.functional.discussionBoard.moderator.tags.create(
    connection,
    {
      body: {
        name: "economic-analysis",
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag2);

  const tag3 = await api.functional.discussionBoard.moderator.tags.create(
    connection,
    {
      body: {
        name: "federal-reserve",
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag3);

  // Step 3: Create required category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Policy",
          description: "Articles about economic policies and analysis",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Authenticate as member
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 5: Create articles with multiple tag combinations
  const article1 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [category.id],
        tag_ids: [tag1.id, tag2.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);

  const article2 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [category.id],
        tag_ids: [tag1.id, tag3.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);

  const article3 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [category.id],
        tag_ids: [tag1.id, tag2.id, tag3.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article3);

  const article4 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [category.id],
        tag_ids: [tag2.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article4);

  // Step 6: Search articles by tag1 (monetary-policy)
  const searchResult = await api.functional.discussionBoard.tags.articles.index(
    connection,
    {
      tagSlug: tag1.slug,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult);

  // Step 7: Verify that the expected articles with tag1 are returned
  const expectedArticleIds = [article1.id, article2.id, article3.id];
  const returnedArticleIds = searchResult.data.map((article) => article.id);

  for (const expectedId of expectedArticleIds) {
    TestValidator.predicate(
      `article ${expectedId} should be in search results`,
      returnedArticleIds.includes(expectedId),
    );
  }

  // Step 8: Verify article4 (which only has tag2) is NOT in the results
  TestValidator.predicate(
    "article with only tag2 should not appear in tag1 search",
    !returnedArticleIds.includes(article4.id),
  );

  // Step 9: Validate that all returned articles include the searched tag
  for (const returnedArticle of searchResult.data) {
    const hasSearchedTag = returnedArticle.tags.some(
      (tag) => tag.id === tag1.id,
    );
    TestValidator.predicate(
      "returned article must include the searched tag",
      hasSearchedTag,
    );
  }

  // Step 10: Verify that articles with multiple tags are properly represented
  const multiTagArticles = searchResult.data.filter(
    (article) => article.tags.length > 1,
  );
  TestValidator.predicate(
    "some articles should have multiple tags",
    multiTagArticles.length > 0,
  );
}
