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
 * Test successful article creation by authenticated customer with proper
 * channel assignment. Validates that customers can create articles with rich
 * content, metadata, and organizational context. The test verifies that all
 * required fields are validated, channel relationships are established
 * correctly, and the article is created with appropriate default values for
 * engagement metrics and publication status.
 */
export async function test_api_customer_article_creation_with_channel(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for channel creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ canCreateChannels: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create shopping mall channel as administrator
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({ allowCustomerArticles: true }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 3: Create customer account for article creation
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPassword123!";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      ip: "192.168.1.1",
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 4: Customer login to establish session
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: "192.168.1.1",
      href: "https://shoppingmall.example.com/articles/create",
      referrer: "https://shoppingmall.example.com/dashboard",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 5: Create article as customer
  const articleData = {
    actor_type: "customer",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    subtitle: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.content({ paragraphs: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    featured: true,
    allow_comments: true,
    channel_id: channel.id,
    section_id: undefined,
  } satisfies IShoppingMallArticle.ICreate;

  const article = await api.functional.shoppingMall.customer.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Step 6: Validate business logic and relationships (NOT type validation)
  TestValidator.equals(
    "article actor type matches customer",
    article.actor_type,
    "customer",
  );
  TestValidator.equals(
    "article title matches creation data",
    article.title,
    articleData.title,
  );
  TestValidator.equals(
    "article content matches creation data",
    article.content,
    articleData.content,
  );
  TestValidator.equals(
    "article channel relationship established",
    article.channel.id,
    channel.id,
  );
  TestValidator.equals(
    "engagement metrics initialized to zero",
    article.view_count,
    0,
  );
  TestValidator.equals("like count initialized to zero", article.like_count, 0);
  TestValidator.equals(
    "share count initialized to zero",
    article.share_count,
    0,
  );
  TestValidator.predicate(
    "article has valid creation timestamp",
    article.created_at !== null && article.created_at !== undefined,
  );
  TestValidator.predicate(
    "article has valid update timestamp",
    article.updated_at !== null && article.updated_at !== undefined,
  );
}
