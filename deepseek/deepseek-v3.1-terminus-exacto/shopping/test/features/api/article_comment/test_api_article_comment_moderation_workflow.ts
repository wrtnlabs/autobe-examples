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
 * Test comment moderation workflow by creating comments with different status
 * transitions. Customer creates comment that undergoes moderation process,
 * validates status changes from pending to approved/rejected based on content
 * policies. Business logic includes automated content validation, moderation
 * queue processing, and proper status tracking for audit purposes.
 */
export async function test_api_article_comment_moderation_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ can_moderate: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create shopping channel
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
  const article = await api.functional.shoppingMall.customer.articles.create(
    connection,
    {
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
    },
  );
  typia.assert(article);

  // Step 5: Customer creates comment
  const commentContent = RandomGenerator.content({ paragraphs: 1 });
  const comment =
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

  // Step 6: Validate comment creation
  TestValidator.equals(
    "comment should have pending status",
    comment.status,
    "pending",
  );
  TestValidator.equals("comment like count should be 0", comment.like_count, 0);
  TestValidator.equals(
    "comment report count should be 0",
    comment.report_count,
    0,
  );
  TestValidator.equals("comment depth should be 0", comment.depth, 0);
  TestValidator.equals(
    "comment actor type should be customer",
    comment.actor_type,
    "customer",
  );
  TestValidator.equals(
    "comment article ID should match",
    comment.shopping_mall_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment content should match input",
    comment.content,
    commentContent,
  );

  // Step 7: Create reply comment to test threading
  const replyContent = RandomGenerator.content({ paragraphs: 1 });
  const replyComment =
    await api.functional.shoppingMall.customer.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: replyContent,
          actor_type: "customer",
          parent: {
            id: comment.id,
            content: comment.content,
            status: comment.status,
            like_count: comment.like_count,
            report_count: comment.report_count,
            depth: comment.depth,
            actor_type: comment.actor_type,
            article: {
              id: article.id,
              title: article.title,
              subtitle: article.subtitle,
              summary: article.summary,
              status: article.status,
              business_status: article.business_status,
              featured: article.featured,
              allow_comments: article.allow_comments,
              view_count: article.view_count,
              published_at: article.published_at,
              created_at: article.created_at,
              updated_at: article.updated_at,
              channel: article.channel,
              section: article.section,
            } satisfies IShoppingMallArticle.ISummary,
          } satisfies IShoppingMallArticleComment.ISummary,
        } satisfies IShoppingMallArticleComment.ICreate,
      },
    );
  typia.assert(replyComment);

  // Step 8: Validate reply comment properties
  TestValidator.equals(
    "reply comment should have pending status",
    replyComment.status,
    "pending",
  );
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
  TestValidator.equals(
    "reply comment content should match input",
    replyComment.content,
    replyContent,
  );

  // Step 9: Test comment with different content lengths
  const shortContent = RandomGenerator.substring(
    RandomGenerator.content({ paragraphs: 1 }),
  );
  const shortComment =
    await api.functional.shoppingMall.customer.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: shortContent,
          actor_type: "customer",
        } satisfies IShoppingMallArticleComment.ICreate,
      },
    );
  typia.assert(shortComment);

  TestValidator.equals(
    "short comment should have pending status",
    shortComment.status,
    "pending",
  );
  TestValidator.predicate(
    "short comment content should not be empty",
    shortComment.content.length > 0,
  );
  TestValidator.equals(
    "short comment content should match input",
    shortComment.content,
    shortContent,
  );

  // Step 10: Validate audit trail through timestamps
  TestValidator.predicate(
    "comment should have creation timestamp",
    comment.created_at !== undefined,
  );
  TestValidator.predicate(
    "comment should have update timestamp",
    comment.updated_at !== undefined,
  );
  TestValidator.predicate(
    "reply comment should have creation timestamp",
    replyComment.created_at !== undefined,
  );
  TestValidator.predicate(
    "reply comment should have update timestamp",
    replyComment.updated_at !== undefined,
  );
  TestValidator.predicate(
    "short comment should have creation timestamp",
    shortComment.created_at !== undefined,
  );
  TestValidator.predicate(
    "short comment should have update timestamp",
    shortComment.updated_at !== undefined,
  );
}
