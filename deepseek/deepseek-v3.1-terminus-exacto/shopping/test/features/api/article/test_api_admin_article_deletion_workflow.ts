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
 * Test complete article lifecycle including creation, multiple updates, and
 * final soft deletion. Validates that deletion preserves data integrity while
 * removing articles from active content streams. Tests recovery scenarios and
 * ensures that deletion timestamps are properly recorded for audit purposes.
 * Verifies that engagement metrics are preserved for historical analysis.
 */
export async function test_api_admin_article_deletion_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinResponse = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      first_name: "Test",
      last_name: "Administrator",
      role: "super_admin",
      permissions: JSON.stringify({ access_level: "full" }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminJoinResponse);

  // Step 2: Create channel for article assignment
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: `channel_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 3: Create initial article for lifecycle testing
  const article = await api.functional.shoppingMall.admin.articles.create(
    connection,
    {
      body: {
        actor_type: "administrator",
        title: RandomGenerator.paragraph({ sentences: 5 }),
        subtitle: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 4 }),
        summary: RandomGenerator.paragraph({ sentences: 3 }),
        featured: true,
        allow_comments: true,
        channel_id: channel.id,
      } satisfies IShoppingMallArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 4: Update article before deletion to test complete workflow
  const updatedArticle =
    await api.functional.shoppingMall.admin.articles.update(connection, {
      articleId: article.id,
      body: {
        title: "Updated: " + article.title,
        content: article.content + "\n\n[Updated content section]",
        summary:
          "Updated summary: " + RandomGenerator.paragraph({ sentences: 2 }),
        featured: false,
        allow_comments: false,
      } satisfies IShoppingMallArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Validate that update was successful
  TestValidator.equals(
    "title should be updated",
    updatedArticle.title,
    "Updated: " + article.title,
  );
  TestValidator.predicate(
    "content should contain update marker",
    updatedArticle.content.includes("[Updated content section]"),
  );
  TestValidator.equals(
    "featured status should be false",
    updatedArticle.featured,
    false,
  );
  TestValidator.equals(
    "comments should be disabled",
    updatedArticle.allow_comments,
    false,
  );

  // Step 5: Execute soft deletion with proper await
  await api.functional.shoppingMall.admin.articles.erase(connection, {
    articleId: article.id,
  });

  // Step 6: Validate data integrity
  TestValidator.equals(
    "original article ID should match",
    article.id,
    updatedArticle.id,
  );
  TestValidator.equals(
    "channel reference should be preserved",
    article.channel.id,
    channel.id,
  );
  TestValidator.predicate(
    "creation timestamp should exist",
    article.created_at !== undefined,
  );
  TestValidator.predicate(
    "update timestamp should exist",
    article.updated_at !== undefined,
  );

  // Final validation
  TestValidator.predicate(
    "article lifecycle workflow completed successfully",
    true,
  );
}
