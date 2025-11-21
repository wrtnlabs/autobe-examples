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
 * Test retrieving a specific comment by its unique identifier.
 *
 * This E2E test validates the comment retrieval functionality by creating an
 * article with multiple comments, then retrieving individual comments by their
 * IDs to verify accurate comment retrieval. The test validates that the system
 * returns complete comment information including content, engagement metrics,
 * moderation status, and proper actor attribution.
 */
export async function test_api_article_comment_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123",
        first_name: "Admin",
        last_name: "User",
        role: "super_admin",
        permissions: "{}",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create shopping mall channel
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: "test-channel",
        name: "Test Channel",
        description: "Test channel for article comments",
        status: "active",
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Create article
  const article: IShoppingMallArticle =
    await api.functional.shoppingMall.admin.articles.create(connection, {
      body: {
        actor_type: "administrator",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        featured: false,
        allow_comments: true,
        channel_id: channel.id,
      } satisfies IShoppingMallArticle.ICreate,
    });
  typia.assert(article);

  // 4. Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "customer123",
        first_name: "Test",
        last_name: "Customer",
        phone_number: RandomGenerator.mobile(),
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 5. Switch to customer authentication
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 6. Create multiple comments
  const comments: IShoppingMallArticleComment[] = [];

  for (let i = 0; i < 3; i++) {
    const comment: IShoppingMallArticleComment =
      await api.functional.shoppingMall.customer.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
            actor_type: "customer",
          } satisfies IShoppingMallArticleComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }

  // 7. Retrieve and validate each comment
  for (const createdComment of comments) {
    const retrievedComment: IShoppingMallArticleComment =
      await api.functional.shoppingMall.articles.comments.at(connection, {
        articleId: article.id,
        commentId: createdComment.id,
      });
    typia.assert(retrievedComment);

    // Validate comment data integrity
    TestValidator.equals(
      "comment ID matches",
      retrievedComment.id,
      createdComment.id,
    );
    TestValidator.equals(
      "comment content matches",
      retrievedComment.content,
      createdComment.content,
    );
    TestValidator.equals(
      "comment status matches",
      retrievedComment.status,
      createdComment.status,
    );
    TestValidator.equals(
      "comment actor type matches",
      retrievedComment.actor_type,
      createdComment.actor_type,
    );
    TestValidator.equals(
      "comment like count matches",
      retrievedComment.like_count,
      createdComment.like_count,
    );
    TestValidator.equals(
      "comment report count matches",
      retrievedComment.report_count,
      createdComment.report_count,
    );
    TestValidator.equals(
      "comment depth matches",
      retrievedComment.depth,
      createdComment.depth,
    );
    TestValidator.equals(
      "article ID matches",
      retrievedComment.shopping_mall_article_id,
      article.id,
    );

    // Validate comment-article relationship
    TestValidator.predicate(
      "comment has article reference",
      retrievedComment.article !== undefined,
    );
    if (retrievedComment.article) {
      TestValidator.equals(
        "article ID in comment reference matches",
        retrievedComment.article.id,
        article.id,
      );
      TestValidator.equals(
        "article title in comment reference matches",
        retrievedComment.article.title,
        article.title,
      );
    }
  }
}
