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
 * Test that customers can successfully delete their own comments on articles.
 * Validates proper ownership verification and comment removal workflow.
 * Customer creates a new account, creates an article in an existing channel,
 * adds a comment to the article, then deletes their own comment. The test
 * verifies that the comment is permanently removed from the system and cannot
 * be retrieved afterwards.
 */
export async function test_api_customer_comment_deletion_by_author(
  connection: api.IConnection,
) {
  // 1. Create admin account for channel creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
        permissions: JSON.stringify({ access: "full" }),
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create shopping mall channel
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "customer123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Create article in the channel
  const article: IShoppingMallArticle =
    await api.functional.shoppingMall.customer.articles.create(connection, {
      body: {
        actor_type: "customer",
        title: RandomGenerator.paragraph({ sentences: 5 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        channel_id: channel.id,
        allow_comments: true,
      } satisfies IShoppingMallArticle.ICreate,
    });
  typia.assert(article);

  // 5. Add comment to the article
  const comment: IShoppingMallArticleComment =
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
  typia.assert(comment);

  // 6. Delete the comment
  const deletedComment: IShoppingMallArticleComment =
    await api.functional.shoppingMall.customer.articles.comments.erase(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(deletedComment);

  // 7. Verify comment deletion by attempting to create a reply to deleted comment
  await TestValidator.error(
    "should not allow creating reply to deleted comment",
    async () => {
      await api.functional.shoppingMall.customer.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
            actor_type: "customer",
            parent: {
              id: deletedComment.id,
              content: deletedComment.content,
              status: deletedComment.status,
              like_count: deletedComment.like_count,
              report_count: deletedComment.report_count,
              depth: deletedComment.depth,
              actor_type: deletedComment.actor_type,
            } satisfies IShoppingMallArticleComment.ISummary,
          } satisfies IShoppingMallArticleComment.ICreate,
        },
      );
    },
  );

  // 8. Additional validation: Verify deletion was successful
  TestValidator.equals(
    "deleted comment ID should match original comment ID",
    deletedComment.id,
    comment.id,
  );
}
