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
 * Test threaded comment functionality by creating a reply to an existing
 * comment. This comprehensive E2E test validates the complete workflow of
 * threaded comments in a shopping mall article system, including
 * authentication, channel creation, article posting, and hierarchical comment
 * threading with proper depth tracking.
 */
export async function test_api_article_comment_reply_threading(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "password123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create admin account for channel creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ can_create_channels: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create shopping channel as prerequisite for article creation
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Switch back to customer account for article creation
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "password123",
      href: "https://shoppingmall.com/articles",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 4: Create article to host comments
  const article = await api.functional.shoppingMall.customer.articles.create(
    connection,
    {
      body: {
        actor_type: "customer",
        title: RandomGenerator.paragraph({ sentences: 5 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        channel_id: channel.id,
        allow_comments: true,
      } satisfies IShoppingMallArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Create parent comment for reply testing
  const parentComment =
    await api.functional.shoppingMall.customer.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          actor_type: "customer",
        } satisfies IShoppingMallArticleComment.ICreate,
      },
    );
  typia.assert(parentComment);

  // Validate parent comment has depth 0 (root level)
  TestValidator.equals(
    "parent comment depth should be 0",
    parentComment.depth,
    0,
  );

  // Step 6: Create reply comment with proper threading hierarchy
  const replyComment =
    await api.functional.shoppingMall.customer.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          actor_type: "customer",
          parent: {
            id: parentComment.id,
            content: parentComment.content,
            status: parentComment.status,
            like_count: parentComment.like_count,
            report_count: parentComment.report_count,
            depth: parentComment.depth,
            actor_type: parentComment.actor_type,
          } satisfies IShoppingMallArticleComment.ISummary,
        } satisfies IShoppingMallArticleComment.ICreate,
      },
    );
  typia.assert(replyComment);

  // Step 7: Validate threading hierarchy and depth calculation
  TestValidator.equals(
    "reply comment depth should be 1",
    replyComment.depth,
    1,
  );
  TestValidator.equals(
    "reply comment article ID should match",
    replyComment.shopping_mall_article_id,
    article.id,
  );

  // Validate parent-child relationship with proper null checking
  TestValidator.predicate(
    "reply comment should have parent reference",
    replyComment.parent !== undefined,
  );

  if (replyComment.parent !== undefined) {
    TestValidator.equals(
      "reply parent ID should match original parent",
      replyComment.parent.id,
      parentComment.id,
    );
    TestValidator.equals(
      "reply parent content should match",
      replyComment.parent.content,
      parentComment.content,
    );
  }

  // Step 8: Validate thread integrity and business logic
  TestValidator.predicate(
    "reply comment status should be valid",
    ["pending", "approved", "rejected", "flagged"].includes(
      replyComment.status,
    ),
  );

  TestValidator.predicate(
    "reply comment actor type should be customer",
    replyComment.actor_type === "customer",
  );

  TestValidator.predicate(
    "reply comment should have valid engagement metrics",
    replyComment.like_count >= 0 && replyComment.report_count >= 0,
  );

  // Validate timestamp ordering
  TestValidator.predicate(
    "reply should be created after parent comment",
    new Date(replyComment.created_at) > new Date(parentComment.created_at),
  );

  // Additional validation: Ensure no circular references
  TestValidator.predicate(
    "reply comment should not reference itself",
    replyComment.parent === undefined ||
      replyComment.parent.id !== replyComment.id,
  );
}
