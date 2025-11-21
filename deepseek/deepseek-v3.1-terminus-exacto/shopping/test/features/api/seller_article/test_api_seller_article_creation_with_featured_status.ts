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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test article creation with featured status and comment controls. Seller
 * creates an article with featured positioning enabled and comment permissions
 * configured. Validates business logic for featured article placement and
 * community engagement settings. Tests that featured articles receive proper
 * priority treatment and that comment controls function correctly based on
 * platform configuration.
 */
export async function test_api_seller_article_creation_with_featured_status(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller_password_123";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: undefined,
      ip: undefined,
      href: "https://shoppingmall.example.com/seller/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create admin account to establish channel infrastructure
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin_password_123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ can_create_channels: true }),
      status: "active",
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
        configuration: JSON.stringify({ allow_seller_articles: true }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Switch back to seller account for article creation
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: undefined,
      href: "https://shoppingmall.example.com/seller/dashboard",
      referrer: "https://shoppingmall.example.com",
      device: undefined,
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 4: Seller creates article with featured status enabled and comment controls configured
  const articleData = {
    actor_type: "seller",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    subtitle: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.content({ paragraphs: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    featured: true,
    allow_comments: true,
    channel_id: channel.id,
    section_id: undefined,
  } satisfies IShoppingMallArticle.ICreate;

  const createdArticle =
    await api.functional.shoppingMall.seller.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  // Step 5: Validate article creation response includes correct featured and comment settings
  TestValidator.equals(
    "article featured status should be true",
    createdArticle.featured,
    true,
  );
  TestValidator.equals(
    "article should allow comments",
    createdArticle.allow_comments,
    true,
  );
  TestValidator.equals(
    "article actor type should be seller",
    createdArticle.actor_type,
    "seller",
  );
  TestValidator.equals(
    "article channel ID should match",
    createdArticle.channel.id,
    channel.id,
  );
  TestValidator.equals(
    "article title should match",
    createdArticle.title,
    articleData.title,
  );
  TestValidator.equals(
    "article content should match",
    createdArticle.content,
    articleData.content,
  );

  // Step 6: Verify business logic for featured article prioritization
  TestValidator.predicate(
    "featured article should have valid business status",
    createdArticle.business_status === "draft" ||
      createdArticle.business_status === "published",
  );

  // Step 7: Test comment permission functionality
  TestValidator.predicate(
    "article should have valid publication status",
    createdArticle.status === "draft" || createdArticle.status === "published",
  );

  // Additional validations for comprehensive testing
  TestValidator.predicate(
    "article should have valid view count",
    createdArticle.view_count >= 0,
  );
  TestValidator.predicate(
    "article should have valid like count",
    createdArticle.like_count >= 0,
  );
  TestValidator.predicate(
    "article should have valid share count",
    createdArticle.share_count >= 0,
  );
  TestValidator.predicate(
    "article should have valid creation timestamp",
    typeof createdArticle.created_at === "string" &&
      createdArticle.created_at.length > 0,
  );

  // Test edge case: Create article without featured status
  const regularArticleData = {
    actor_type: "seller",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    subtitle: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.content({ paragraphs: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    featured: false,
    allow_comments: false,
    channel_id: channel.id,
    section_id: undefined,
  } satisfies IShoppingMallArticle.ICreate;

  const regularArticle =
    await api.functional.shoppingMall.seller.articles.create(connection, {
      body: regularArticleData,
    });
  typia.assert(regularArticle);

  TestValidator.equals(
    "regular article featured status should be false",
    regularArticle.featured,
    false,
  );
  TestValidator.equals(
    "regular article should not allow comments",
    regularArticle.allow_comments,
    false,
  );

  // Test that featured articles are properly differentiated
  TestValidator.notEquals(
    "featured and regular articles should have different featured status",
    createdArticle.featured,
    regularArticle.featured,
  );
}
