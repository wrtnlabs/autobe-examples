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
 * Validate comment retrieval access controls based on moderation status and
 * user permissions.
 *
 * This test creates comments and tests access control scenarios using the
 * available API functions. It focuses on testing the actual behavior of the
 * comment retrieval endpoint with different user authentication contexts rather
 * than attempting to manipulate comment statuses that may not be supported by
 * the available APIs.
 */
export async function test_api_article_comment_retrieval_access_controls(
  connection: api.IConnection,
) {
  // Step 1: Create admin user account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin",
      permissions: JSON.stringify({ can_moderate: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create customer user account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 3: Create shopping mall channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({ allow_comments: true }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 4: Create article
  const article = await api.functional.shoppingMall.admin.articles.create(
    connection,
    {
      body: {
        actor_type: "administrator",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        subtitle: RandomGenerator.paragraph({ sentences: 1 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        featured: true,
        allow_comments: true,
        channel_id: channel.id,
      } satisfies IShoppingMallArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Create a comment as customer
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  const comment =
    await api.functional.shoppingMall.customer.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.content({ paragraphs: 1 }),
          actor_type: "customer",
        } satisfies IShoppingMallArticleComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 6: Test access controls with different user contexts

  // Test 1: Original customer should be able to retrieve their own comment
  const retrievedByOwner =
    await api.functional.shoppingMall.articles.comments.at(connection, {
      articleId: article.id,
      commentId: comment.id,
    });
  typia.assert(retrievedByOwner);
  TestValidator.equals(
    "comment owner can retrieve their comment",
    retrievedByOwner.id,
    comment.id,
  );

  // Test 2: Admin should be able to retrieve the comment
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  const retrievedByAdmin =
    await api.functional.shoppingMall.articles.comments.at(connection, {
      articleId: article.id,
      commentId: comment.id,
    });
  typia.assert(retrievedByAdmin);
  TestValidator.equals(
    "admin can retrieve customer comment",
    retrievedByAdmin.id,
    comment.id,
  );

  // Test 3: Unauthenticated user should not be able to retrieve comments
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated user cannot retrieve comment",
    async () => {
      await api.functional.shoppingMall.articles.comments.at(unauthConn, {
        articleId: article.id,
        commentId: comment.id,
      });
    },
  );

  // Test 4: Create a second customer and test cross-customer access
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer2 = await api.functional.auth.customer.join(connection, {
    body: {
      email: customer2Email,
      password: "customer123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer2);

  await api.functional.auth.customer.login(connection, {
    body: {
      email: customer2Email,
      password: "customer123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Test whether second customer can access first customer's comment
  // This tests the comment access control logic
  const retrievedByCustomer2 =
    await api.functional.shoppingMall.articles.comments.at(connection, {
      articleId: article.id,
      commentId: comment.id,
    });
  typia.assert(retrievedByCustomer2);
  TestValidator.equals(
    "other customer can retrieve comment",
    retrievedByCustomer2.id,
    comment.id,
  );

  // Validate comment properties are consistent
  TestValidator.equals(
    "comment content matches",
    retrievedByOwner.content,
    comment.content,
  );
  TestValidator.equals(
    "comment actor type is customer",
    retrievedByOwner.actor_type,
    "customer",
  );
  TestValidator.predicate(
    "comment has valid creation timestamp",
    retrievedByOwner.created_at !== null &&
      retrievedByOwner.created_at !== undefined,
  );
}
