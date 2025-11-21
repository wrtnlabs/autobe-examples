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
 * Validate public retrieval of published articles without authentication.
 *
 * This test ensures that published articles are accessible to unauthenticated
 * users and contain complete information including content, metadata,
 * engagement metrics, and organizational context through channel and section
 * relationships.
 */
export async function test_api_article_public_retrieval(
  connection: api.IConnection,
) {
  // 1. Create admin account for channel creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "support_admin",
        permissions: JSON.stringify({ read: true, write: true }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create shopping mall channel
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({ allowPublicAccess: true }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Create customer account for article creation
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "customer123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        phone_number: RandomGenerator.mobile(),
        ip: "192.168.1.1",
        href: "https://shoppingmall.example.com/register",
        referrer: "https://shoppingmall.example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Create published article
  const article: IShoppingMallArticle =
    await api.functional.shoppingMall.customer.articles.create(connection, {
      body: {
        actor_type: "customer",
        title: RandomGenerator.paragraph({ sentences: 5 }),
        subtitle: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 8 }),
        featured: true,
        allow_comments: true,
        channel_id: channel.id,
      } satisfies IShoppingMallArticle.ICreate,
    });
  typia.assert(article);

  // 5. Create unauthenticated connection for public access test
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 6. Test public retrieval without authentication
  const retrievedArticle: IShoppingMallArticle =
    await api.functional.shoppingMall.articles.at(unauthConn, {
      articleId: article.id,
    });
  typia.assert(retrievedArticle);

  // 7. Validate article content and metadata
  TestValidator.equals("article ID matches", retrievedArticle.id, article.id);
  TestValidator.equals(
    "article title matches",
    retrievedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "article content matches",
    retrievedArticle.content,
    article.content,
  );
  TestValidator.equals(
    "article actor type is customer",
    retrievedArticle.actor_type,
    "customer",
  );

  // Validate publication status - use actual status from created article
  TestValidator.equals(
    "article status matches",
    retrievedArticle.status,
    article.status,
  );

  // Validate publication timeline
  TestValidator.predicate(
    "article has publication timestamp",
    retrievedArticle.published_at !== null &&
      retrievedArticle.published_at !== undefined,
  );
  TestValidator.predicate(
    "article has creation timestamp",
    retrievedArticle.created_at !== null &&
      retrievedArticle.created_at !== undefined,
  );

  // Validate organizational context
  TestValidator.predicate(
    "article has channel information",
    retrievedArticle.channel !== null && retrievedArticle.channel !== undefined,
  );
  TestValidator.equals(
    "channel ID matches",
    retrievedArticle.channel.id,
    channel.id,
  );
  TestValidator.equals(
    "channel name matches",
    retrievedArticle.channel.name,
    channel.name,
  );

  // 8. Validate engagement metrics are properly initialized
  TestValidator.predicate(
    "view count is non-negative number",
    retrievedArticle.view_count >= 0,
  );
  TestValidator.predicate(
    "like count is non-negative number",
    retrievedArticle.like_count >= 0,
  );
  TestValidator.predicate(
    "share count is non-negative number",
    retrievedArticle.share_count >= 0,
  );

  // 9. Validate business status and publication controls
  TestValidator.predicate(
    "business status is set",
    retrievedArticle.business_status !== null &&
      retrievedArticle.business_status !== undefined,
  );
  TestValidator.predicate(
    "featured flag is boolean",
    typeof retrievedArticle.featured === "boolean",
  );
  TestValidator.predicate(
    "comments allowed flag is boolean",
    typeof retrievedArticle.allow_comments === "boolean",
  );

  // 10. Validate organizational context integrity
  TestValidator.predicate(
    "channel has valid ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedArticle.channel.id,
    ),
  );
  TestValidator.predicate(
    "channel has name",
    retrievedArticle.channel.name.length > 0,
  );
  TestValidator.predicate(
    "channel has code",
    retrievedArticle.channel.code.length > 0,
  );
}
