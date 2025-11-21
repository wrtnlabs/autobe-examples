import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Test customer updating article featured status and comment permissions.
 *
 * This comprehensive E2E test validates that customers can control article
 * visibility and engagement features while ensuring proper access controls
 * prevent unauthorized modifications to system-managed fields.
 *
 * The test follows a complete workflow:
 *
 * 1. Create customer account for authentication
 * 2. Create admin account for channel creation
 * 3. Create shopping mall channel for article organization
 * 4. Create initial article with default settings
 * 5. Update article featured status and comment permissions
 * 6. Validate updates were applied correctly
 */
export async function test_api_customer_article_update_featured_settings(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customer123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shopping-mall.example.com/register",
      referrer: "https://shopping-mall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create admin account for channel creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ can_create_channels: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create shopping mall channel for article organization
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Switch back to customer authentication
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://shopping-mall.example.com/articles/create",
      referrer: "https://shopping-mall.example.com/dashboard",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 4: Create initial article with default settings
  const initialArticle =
    await api.functional.shoppingMall.customer.articles.create(connection, {
      body: {
        actor_type: "customer",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        subtitle: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 4 }),
        featured: false,
        allow_comments: true,
        channel_id: channel.id,
      } satisfies IShoppingMallArticle.ICreate,
    });
  typia.assert(initialArticle);

  // Validate initial article settings
  TestValidator.equals(
    "initial featured status should be false",
    initialArticle.featured,
    false,
  );
  TestValidator.equals(
    "initial allow_comments should be true",
    initialArticle.allow_comments,
    true,
  );

  // Step 5: Update article featured status and comment permissions
  const updatedArticle =
    await api.functional.shoppingMall.customer.articles.update(connection, {
      articleId: initialArticle.id,
      body: {
        featured: true,
        allow_comments: false,
      } satisfies IShoppingMallArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Step 6: Validate updates were applied correctly
  TestValidator.equals(
    "featured status should be updated to true",
    updatedArticle.featured,
    true,
  );
  TestValidator.equals(
    "allow_comments should be updated to false",
    updatedArticle.allow_comments,
    false,
  );
  TestValidator.equals(
    "article ID should remain the same",
    updatedArticle.id,
    initialArticle.id,
  );
  TestValidator.equals(
    "title should remain unchanged",
    updatedArticle.title,
    initialArticle.title,
  );
  TestValidator.equals(
    "content should remain unchanged",
    updatedArticle.content,
    initialArticle.content,
  );
  TestValidator.equals(
    "channel should remain the same",
    updatedArticle.channel.id,
    initialArticle.channel.id,
  );

  // Validate that system-managed fields are preserved
  TestValidator.equals(
    "view count should be preserved",
    updatedArticle.view_count,
    initialArticle.view_count,
  );
  TestValidator.equals(
    "like count should be preserved",
    updatedArticle.like_count,
    initialArticle.like_count,
  );
  TestValidator.equals(
    "share count should be preserved",
    updatedArticle.share_count,
    initialArticle.share_count,
  );
  TestValidator.equals(
    "status should be preserved",
    updatedArticle.status,
    initialArticle.status,
  );
  TestValidator.equals(
    "business_status should be preserved",
    updatedArticle.business_status,
    initialArticle.business_status,
  );
}
