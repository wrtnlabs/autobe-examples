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
 * Test successful article creation workflow for sellers with proper channel
 * assignment.
 *
 * This comprehensive E2E test validates the complete workflow of seller
 * registration, channel creation by admin, and article creation within the
 * assigned channel. The test ensures proper authentication flow, channel
 * ownership attribution, and article publication controls.
 *
 * Key validation points include:
 *
 * 1. Seller registration and authentication setup
 * 2. Admin authentication for channel creation
 * 3. Shopping channel creation with proper configuration
 * 4. Seller article creation with channel assignment
 * 5. Validation of article properties and channel relationships
 * 6. Business logic for content creation including title validation and
 *    publication workflows
 *
 * The test follows realistic business scenarios with proper multi-actor
 * authentication switching and validates that articles are properly assigned to
 * channels with correct ownership attribution.
 */
export async function test_api_seller_article_creation_with_channel(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller123";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.paragraph({ sentences: 3 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 5 }),
      tax_id: undefined,
      ip: undefined,
      href: "https://shopping-mall.example.com/seller/register",
      referrer: "https://shopping-mall.example.com/",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create admin account for channel creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

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

  // Step 3: Create shopping channel as admin
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8).toUpperCase(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({
          allow_seller_articles: true,
          max_articles_per_seller: 100,
          moderation_required: false,
        }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 4: Switch back to seller authentication
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: undefined,
      href: "https://shopping-mall.example.com/seller/dashboard",
      referrer: "https://shopping-mall.example.com/",
      device: undefined,
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Create article as seller within the assigned channel
  const articleTitle = RandomGenerator.paragraph({ sentences: 4 });
  const articleContent = RandomGenerator.content({ paragraphs: 3 });

  const article = await api.functional.shoppingMall.seller.articles.create(
    connection,
    {
      body: {
        actor_type: "seller",
        title: articleTitle,
        subtitle: RandomGenerator.paragraph({ sentences: 2 }),
        content: articleContent,
        summary: RandomGenerator.paragraph({ sentences: 3 }),
        featured: false,
        allow_comments: true,
        channel_id: channel.id,
        section_id: undefined,
      } satisfies IShoppingMallArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 6: Validate article creation results
  TestValidator.predicate(
    "article ID should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      article.id,
    ),
  );
  TestValidator.equals(
    "actor type should be seller",
    article.actor_type,
    "seller",
  );
  TestValidator.equals(
    "article title should match input",
    article.title,
    articleTitle,
  );
  TestValidator.equals(
    "article content should match input",
    article.content,
    articleContent,
  );
  TestValidator.equals(
    "article channel ID should match created channel",
    article.channel.id,
    channel.id,
  );
  TestValidator.equals(
    "article channel name should match created channel",
    article.channel.name,
    channel.name,
  );
  TestValidator.predicate(
    "article should have default view count of 0",
    article.view_count === 0,
  );
  TestValidator.predicate(
    "article should have default like count of 0",
    article.like_count === 0,
  );
  TestValidator.predicate(
    "article should have default share count of 0",
    article.share_count === 0,
  );
  TestValidator.predicate(
    "article should not be featured by default",
    article.featured === false,
  );
  TestValidator.predicate(
    "article should allow comments by default",
    article.allow_comments === true,
  );
  TestValidator.predicate(
    "article status should be draft initially",
    article.status === "draft",
  );
  TestValidator.predicate(
    "article should have creation timestamp",
    article.created_at !== undefined,
  );
  TestValidator.predicate(
    "article should have update timestamp",
    article.updated_at !== undefined,
  );
  TestValidator.predicate(
    "article published_at should be undefined for draft",
    article.published_at === undefined,
  );
}
