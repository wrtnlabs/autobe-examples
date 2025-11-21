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
 * Test comment status modification workflow for moderation purposes.
 *
 * Validates customer self-moderation (flagging) and administrator platform
 * moderation (approving/rejecting) workflows with proper role-based permission
 * enforcement and business logic validation.
 */
export async function test_api_article_comment_status_moderation(
  connection: api.IConnection,
) {
  // 1. Create customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Create administrator account for platform moderation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ can_moderate: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // 3. Create shopping channel as prerequisite for article creation
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 4. Create article to host comments
  const article = await api.functional.shoppingMall.customer.articles.create(
    connection,
    {
      body: {
        actor_type: "customer",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        featured: false,
        allow_comments: true,
        channel_id: channel.id,
      } satisfies IShoppingMallArticle.ICreate,
    },
  );
  typia.assert(article);

  // 5. Create initial comment with pending status
  const initialComment =
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
  typia.assert(initialComment);
  TestValidator.equals(
    "initial comment status should be pending",
    initialComment.status,
    "pending",
  );

  // 6. Test customer self-moderation: flag own comment
  const flaggedComment =
    await api.functional.shoppingMall.customer.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          status: "flagged",
        } satisfies IShoppingMallArticleComment.IUpdate,
      },
    );
  typia.assert(flaggedComment);
  TestValidator.equals(
    "customer should be able to flag own comment",
    flaggedComment.status,
    "flagged",
  );

  // 7. Switch to administrator account for platform moderation
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      href: "https://shoppingmall.com/admin",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // 8. Test administrator moderation: approve flagged comment
  const approvedComment =
    await api.functional.shoppingMall.customer.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: flaggedComment.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallArticleComment.IUpdate,
      },
    );
  typia.assert(approvedComment);
  TestValidator.equals(
    "admin should be able to approve comment",
    approvedComment.status,
    "approved",
  );

  // 9. Test administrator moderation: reject comment
  const rejectedComment =
    await api.functional.shoppingMall.customer.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: approvedComment.id,
        body: {
          status: "rejected",
        } satisfies IShoppingMallArticleComment.IUpdate,
      },
    );
  typia.assert(rejectedComment);
  TestValidator.equals(
    "admin should be able to reject comment",
    rejectedComment.status,
    "rejected",
  );

  // 10. Switch back to customer account
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      href: "https://shoppingmall.com/login",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 11. Test customer cannot perform admin moderation actions
  await TestValidator.error(
    "customer should not be able to approve comment",
    async () => {
      await api.functional.shoppingMall.customer.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: rejectedComment.id,
          body: {
            status: "approved",
          } satisfies IShoppingMallArticleComment.IUpdate,
        },
      );
    },
  );

  // 12. Verify comment status remains rejected after failed customer update
  const finalComment =
    await api.functional.shoppingMall.customer.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: rejectedComment.id,
        body: {
          content: "Updated content after rejection",
        } satisfies IShoppingMallArticleComment.IUpdate,
      },
    );
  typia.assert(finalComment);
  TestValidator.equals(
    "comment status should remain rejected",
    finalComment.status,
    "rejected",
  );
  TestValidator.equals(
    "comment content should be updated",
    finalComment.content,
    "Updated content after rejection",
  );
}
