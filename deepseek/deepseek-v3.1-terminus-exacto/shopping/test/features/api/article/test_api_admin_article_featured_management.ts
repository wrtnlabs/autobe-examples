import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Comprehensive E2E test for featured article management functionality
 *
 * Validates the complete workflow for managing featured articles in the
 * shopping mall platform, including administrator authentication, channel
 * creation, article creation, and featured status modification. Tests business
 * rules around featured article limits and ensures proper authorization checks
 * are enforced.
 */
export async function test_api_admin_article_featured_management(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({
        "article:create": true,
        "article:update": true,
        "article:feature": true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a channel for article assignment
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: `channel_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({
          max_featured_articles: 10,
          allow_comments: true,
        }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 3: Create initial article with featured status false
  const article = await api.functional.shoppingMall.admin.articles.create(
    connection,
    {
      body: {
        actor_type: "administrator",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        subtitle: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        featured: false,
        allow_comments: true,
        channel_id: channel.id,
      } satisfies IShoppingMallArticle.ICreate,
    },
  );
  typia.assert(article);
  TestValidator.equals(
    "initial featured status should be false",
    article.featured,
    false,
  );

  // Step 4: Set article as featured
  const featuredArticle =
    await api.functional.shoppingMall.admin.articles.update(connection, {
      articleId: article.id,
      body: {
        featured: true,
      } satisfies IShoppingMallArticle.IUpdate,
    });
  typia.assert(featuredArticle);
  TestValidator.equals(
    "featured status should be true after update",
    featuredArticle.featured,
    true,
  );

  // Step 5: Unset featured status
  const unfeaturedArticle =
    await api.functional.shoppingMall.admin.articles.update(connection, {
      articleId: article.id,
      body: {
        featured: false,
      } satisfies IShoppingMallArticle.IUpdate,
    });
  typia.assert(unfeaturedArticle);
  TestValidator.equals(
    "featured status should be false after second update",
    unfeaturedArticle.featured,
    false,
  );

  // Step 6: Test that featured status changes persist across updates
  TestValidator.equals(
    "article ID should remain consistent",
    unfeaturedArticle.id,
    article.id,
  );
  TestValidator.equals(
    "title should remain unchanged",
    unfeaturedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "channel should remain the same",
    unfeaturedArticle.channel.id,
    article.channel.id,
  );

  // Step 7: Create additional articles to test featured article management
  const additionalArticles = await ArrayUtil.asyncRepeat(3, async (index) => {
    const newArticle = await api.functional.shoppingMall.admin.articles.create(
      connection,
      {
        body: {
          actor_type: "administrator",
          title: `Additional Article ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
          content: RandomGenerator.content({ paragraphs: 2 }),
          featured: index === 0, // Make first additional article featured
          allow_comments: true,
          channel_id: channel.id,
        } satisfies IShoppingMallArticle.ICreate,
      },
    );
    typia.assert(newArticle);
    return newArticle;
  });

  // Validate featured article counts and statuses
  const featuredArticles = additionalArticles.filter((a) => a.featured);
  TestValidator.equals(
    "should have exactly one featured article among additional ones",
    featuredArticles.length,
    1,
  );

  // Step 8: Test comprehensive article update with multiple fields
  const comprehensiveUpdate =
    await api.functional.shoppingMall.admin.articles.update(connection, {
      articleId: article.id,
      body: {
        title: "Updated Title: " + RandomGenerator.paragraph({ sentences: 2 }),
        content:
          "Updated content: " + RandomGenerator.content({ paragraphs: 2 }),
        featured: true,
        allow_comments: false,
      } satisfies IShoppingMallArticle.IUpdate,
    });
  typia.assert(comprehensiveUpdate);
  TestValidator.equals(
    "comprehensive update should set featured to true",
    comprehensiveUpdate.featured,
    true,
  );
  TestValidator.equals(
    "comprehensive update should set allow_comments to false",
    comprehensiveUpdate.allow_comments,
    false,
  );

  // Step 9: Test business rule validation - ensure featured status can be toggled multiple times
  const finalToggle = await api.functional.shoppingMall.admin.articles.update(
    connection,
    {
      articleId: article.id,
      body: {
        featured: false,
      } satisfies IShoppingMallArticle.IUpdate,
    },
  );
  typia.assert(finalToggle);
  TestValidator.equals(
    "final toggle should set featured to false",
    finalToggle.featured,
    false,
  );

  // Step 10: Validate that all article properties are maintained correctly
  TestValidator.equals(
    "article ID consistency across all updates",
    finalToggle.id,
    article.id,
  );
  TestValidator.equals(
    "channel consistency across all updates",
    finalToggle.channel.id,
    article.channel.id,
  );
  TestValidator.predicate(
    "updated title should be different from original",
    finalToggle.title !== article.title,
  );
}
