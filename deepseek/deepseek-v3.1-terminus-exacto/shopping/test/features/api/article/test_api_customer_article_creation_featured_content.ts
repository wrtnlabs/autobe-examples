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
 * Test article creation with featured content settings by authenticated
 * customer. Validates that customers can create featured articles with proper
 * permissions and that featured status is correctly applied. The test covers
 * multi-actor authentication setup, channel creation by admin, and customer
 * article creation with featured content settings and proper actor_type
 * attribution.
 */
export async function test_api_customer_article_creation_featured_content(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for channel creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "support_admin",
        permissions: JSON.stringify({ can_create_channels: true }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create channel for article publishing
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({ allow_customer_articles: true }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create customer account for article creation
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPassword123!";

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        phone_number: RandomGenerator.mobile("010"),
        href: "https://shoppingmall.example.com/register",
        referrer: "https://shoppingmall.example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 4: Create featured article with customer actor_type
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleContent = RandomGenerator.content({ paragraphs: 3 });

  const featuredArticle: IShoppingMallArticle =
    await api.functional.shoppingMall.customer.articles.create(connection, {
      body: {
        actor_type: "customer",
        title: articleTitle,
        subtitle: RandomGenerator.paragraph({ sentences: 1 }),
        content: articleContent,
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        featured: true,
        allow_comments: true,
        channel_id: channel.id,
      } satisfies IShoppingMallArticle.ICreate,
    });
  typia.assert(featuredArticle);

  // Step 5: Validate featured article properties
  TestValidator.equals(
    "article actor_type should be customer",
    featuredArticle.actor_type,
    "customer",
  );
  TestValidator.equals(
    "article title should match",
    featuredArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article content should match",
    featuredArticle.content,
    articleContent,
  );
  TestValidator.predicate(
    "article should be featured",
    featuredArticle.featured,
  );
  TestValidator.predicate(
    "article should allow comments",
    featuredArticle.allow_comments,
  );
  TestValidator.equals(
    "article channel ID should match",
    featuredArticle.channel.id,
    channel.id,
  );
  TestValidator.predicate(
    "article should have draft status",
    featuredArticle.status === "draft",
  );
  TestValidator.equals(
    "article view count should be 0",
    featuredArticle.view_count,
    0,
  );
  TestValidator.equals(
    "article like count should be 0",
    featuredArticle.like_count,
    0,
  );
  TestValidator.equals(
    "article share count should be 0",
    featuredArticle.share_count,
    0,
  );
  TestValidator.predicate(
    "article should have creation timestamp",
    featuredArticle.created_at !== null &&
      featuredArticle.created_at !== undefined,
  );
  TestValidator.predicate(
    "article should have update timestamp",
    featuredArticle.updated_at !== null &&
      featuredArticle.updated_at !== undefined,
  );

  // Step 6: Test non-featured article creation for comparison
  const regularArticle: IShoppingMallArticle =
    await api.functional.shoppingMall.customer.articles.create(connection, {
      body: {
        actor_type: "customer",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        featured: false,
        allow_comments: false,
        channel_id: channel.id,
      } satisfies IShoppingMallArticle.ICreate,
    });
  typia.assert(regularArticle);

  TestValidator.predicate(
    "regular article should not be featured",
    !regularArticle.featured,
  );
  TestValidator.predicate(
    "regular article should not allow comments",
    !regularArticle.allow_comments,
  );

  // Step 7: Validate article business logic
  TestValidator.notEquals(
    "featured and regular articles should have different IDs",
    featuredArticle.id,
    regularArticle.id,
  );
  TestValidator.equals(
    "both articles should have same actor_type",
    featuredArticle.actor_type,
    regularArticle.actor_type,
  );
  TestValidator.equals(
    "both articles should be in same channel",
    featuredArticle.channel.id,
    regularArticle.channel.id,
  );
}
