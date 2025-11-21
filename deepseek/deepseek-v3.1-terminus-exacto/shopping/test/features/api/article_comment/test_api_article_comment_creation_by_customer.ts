import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import type { IShoppingMallArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleComment";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Test successful comment creation workflow on a shopping mall article.
 *
 * This comprehensive E2E test validates the complete flow of customer comment
 * creation with proper authentication, article setup, and comment validation.
 * The scenario involves:
 *
 * 1. Admin authentication and channel creation for article hosting
 * 2. Customer registration and authentication
 * 3. Article creation by customer with comment permissions enabled
 * 4. Comment creation on the article with proper actor attribution
 * 5. Validation of comment properties and engagement metrics
 *
 * The test ensures that comments can be created with proper threading
 * functionality, moderation status assignment, and engagement metric
 * initialization. Business logic includes verifying article existence, checking
 * comment permissions based on article settings, and ensuring proper actor
 * attribution for ownership tracking.
 */
export async function test_api_article_comment_creation_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({ access: "full" }),
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Authenticate as admin for channel creation
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://shoppingmall.example.com/admin",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Step 2: Create shopping channel as prerequisite for article creation
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        status: "active",
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create customer account and authenticate
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customer123";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        phone_number: RandomGenerator.mobile(),
        href: "https://shoppingmall.example.com/register",
        referrer: "https://shoppingmall.example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Authenticate as customer for article and comment operations
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://shoppingmall.example.com/articles",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 4: Create article with comment permissions enabled
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleSubtitle = RandomGenerator.paragraph({ sentences: 2 });
  const articleContent = RandomGenerator.content({ paragraphs: 2 });
  const articleSummary = RandomGenerator.paragraph({ sentences: 4 });

  const article: IShoppingMallArticle =
    await api.functional.shoppingMall.customer.articles.create(connection, {
      body: {
        actor_type: "customer",
        title: articleTitle,
        subtitle: articleSubtitle,
        content: articleContent,
        summary: articleSummary,
        featured: false,
        allow_comments: true,
        channel_id: channel.id,
      } satisfies IShoppingMallArticle.ICreate,
    });
  typia.assert(article);

  // Validate article was created with correct properties
  TestValidator.equals("article title matches", article.title, articleTitle);
  TestValidator.equals(
    "article subtitle matches",
    article.subtitle,
    articleSubtitle,
  );
  TestValidator.equals(
    "article content matches",
    article.content,
    articleContent,
  );
  TestValidator.equals(
    "article summary matches",
    article.summary,
    articleSummary,
  );
  TestValidator.equals(
    "article actor type is customer",
    article.actor_type,
    "customer",
  );
  TestValidator.predicate("article allows comments", article.allow_comments);

  // Step 5: Create comment on the article
  const commentContent = RandomGenerator.paragraph({ sentences: 5 });
  const comment: IShoppingMallArticleComment =
    await api.functional.shoppingMall.customer.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: commentContent,
          actor_type: "customer",
        } satisfies IShoppingMallArticleComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 6: Validate comment properties
  TestValidator.equals(
    "comment content matches input",
    comment.content,
    commentContent,
  );
  TestValidator.equals(
    "comment actor type is customer",
    comment.actor_type,
    "customer",
  );
  TestValidator.equals("comment status is pending", comment.status, "pending");
  TestValidator.equals("comment depth is 0 (root comment)", comment.depth, 0);
  TestValidator.equals(
    "comment like count initialized to 0",
    comment.like_count,
    0,
  );
  TestValidator.equals(
    "comment report count initialized to 0",
    comment.report_count,
    0,
  );
  TestValidator.equals(
    "comment article ID matches",
    comment.shopping_mall_article_id,
    article.id,
  );
  TestValidator.predicate(
    "comment has creation timestamp",
    comment.created_at !== undefined,
  );
  TestValidator.predicate(
    "comment has update timestamp",
    comment.updated_at !== undefined,
  );
  TestValidator.equals(
    "comment has no parent (root comment)",
    comment.parent,
    undefined,
  );

  // Additional validation: Ensure article reference exists
  TestValidator.predicate(
    "comment has article reference",
    comment.article !== undefined,
  );
  TestValidator.equals(
    "comment article ID matches created article",
    comment.article?.id,
    article.id,
  );
}
