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
 * Test comment deletion scenario where administrator deletes customer comments
 * for moderation purposes. Validates role-based access control where
 * administrators can delete comments regardless of ownership. Administrator
 * creates channel, customer creates article and comment, then administrator
 * deletes the comment. Tests proper authorization checks and moderation
 * workflow integration.
 */
export async function test_api_customer_comment_deletion_moderator_access(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
        permissions: JSON.stringify({ moderate_comments: true }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create shopping mall channel
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        configuration: JSON.stringify({ allow_comments: true }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "customer123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        ip: "127.0.0.1",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 4: Create article as customer
  const article: IShoppingMallArticle =
    await api.functional.shoppingMall.customer.articles.create(connection, {
      body: {
        actor_type: "customer",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        subtitle: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 4 }),
        featured: false,
        allow_comments: true,
        channel_id: channel.id,
      } satisfies IShoppingMallArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Create comment on the article as customer
  const comment: IShoppingMallArticleComment =
    await api.functional.shoppingMall.customer.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
          actor_type: "customer",
        } satisfies IShoppingMallArticleComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 6: Switch to administrator authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Step 7: Delete the comment as administrator (moderator access)
  const deletedComment: IShoppingMallArticleComment =
    await api.functional.shoppingMall.customer.articles.comments.erase(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(deletedComment);

  // Step 8: Validate successful deletion with proper TestValidator usage
  TestValidator.equals(
    "deleted comment ID matches original comment ID",
    comment.id,
    deletedComment.id,
  );
  TestValidator.equals(
    "deleted comment content matches original content",
    comment.content,
    deletedComment.content,
  );
  TestValidator.equals(
    "deleted comment actor type remains unchanged",
    comment.actor_type,
    deletedComment.actor_type,
  );
  TestValidator.predicate(
    "administrator successfully deleted customer comment",
    deletedComment.id === comment.id,
  );
}
