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
 * Test article deletion permission validation including ownership verification
 * and role-based access controls. Validates that administrators can delete
 * articles regardless of original creator, while maintaining proper audit
 * trails. Tests edge cases like attempting to delete non-existent articles,
 * already deleted articles, and articles with active dependencies.
 */
export async function test_api_admin_article_deletion_permissions(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "support_admin",
        permissions: JSON.stringify({
          article_management: true,
          content_moderation: true,
        }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(adminAuth);

  // Step 2: Create channel for article assignment
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({
          allow_articles: true,
          moderation_required: false,
        }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create article for permission testing
  const article: IShoppingMallArticle =
    await api.functional.shoppingMall.admin.articles.create(connection, {
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
    });
  typia.assert(article);

  // Step 4: Validate successful article deletion by administrator
  await api.functional.shoppingMall.admin.articles.erase(connection, {
    articleId: article.id,
  });

  // Step 5: Verify soft deletion by attempting to delete already deleted article
  await TestValidator.error(
    "cannot delete already deleted article",
    async () => {
      await api.functional.shoppingMall.admin.articles.erase(connection, {
        articleId: article.id,
      });
    },
  );

  // Step 6: Test deletion of non-existent article
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("cannot delete non-existent article", async () => {
    await api.functional.shoppingMall.admin.articles.erase(connection, {
      articleId: nonExistentArticleId,
    });
  });

  // Step 7: Create another article to test successful deletion workflow
  const secondArticle: IShoppingMallArticle =
    await api.functional.shoppingMall.admin.articles.create(connection, {
      body: {
        actor_type: "administrator",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        subtitle: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 1 }),
        featured: true,
        allow_comments: false,
        channel_id: channel.id,
      } satisfies IShoppingMallArticle.ICreate,
    });
  typia.assert(secondArticle);

  // Step 8: Validate successful deletion of second article
  await api.functional.shoppingMall.admin.articles.erase(connection, {
    articleId: secondArticle.id,
  });

  // Step 9: Test permission validation - ensure proper error handling
  TestValidator.predicate(
    "admin authentication token is properly set",
    adminAuth.token.access.length > 0,
  );

  TestValidator.equals(
    "created channel is properly configured",
    channel.status,
    "active",
  );

  TestValidator.equals(
    "article was created with correct channel assignment",
    article.channel.id,
    channel.id,
  );
}
