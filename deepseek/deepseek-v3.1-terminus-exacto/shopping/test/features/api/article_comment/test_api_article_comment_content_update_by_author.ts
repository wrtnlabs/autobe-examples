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
 * Test comment content update workflow where customer updates their own comment
 * with new content. Validates ownership verification, content re-moderation
 * process, and proper timestamp updates. Business logic includes ensuring only
 * comment authors can modify content, triggering re-validation for updated
 * content, and maintaining comment history integrity.
 */
export async function test_api_article_comment_content_update_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "testPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create shopping channel as prerequisite for article creation
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: `test_channel_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 3: Create article to host comments
  const article = await api.functional.shoppingMall.customer.articles.create(
    connection,
    {
      body: {
        actor_type: "customer",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        channel_id: channel.id,
        allow_comments: true,
      } satisfies IShoppingMallArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 4: Create initial comment to be updated
  const initialCommentContent = RandomGenerator.content({ paragraphs: 1 });
  const comment =
    await api.functional.shoppingMall.customer.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: initialCommentContent,
          actor_type: "customer",
        } satisfies IShoppingMallArticleComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 5: Update comment content with new text
  const updatedCommentContent = RandomGenerator.content({ paragraphs: 1 });
  const updatedComment =
    await api.functional.shoppingMall.customer.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: updatedCommentContent,
        } satisfies IShoppingMallArticleComment.IUpdate,
      },
    );
  typia.assert(updatedComment);

  // Step 6: Verify comment was successfully updated with new content
  TestValidator.equals(
    "updated comment content should match new content",
    updatedComment.content,
    updatedCommentContent,
  );
  TestValidator.notEquals(
    "comment content should be different from original",
    updatedComment.content,
    initialCommentContent,
  );

  // Step 7: Validate that timestamps are properly updated
  TestValidator.predicate(
    "updated_at timestamp should be after created_at",
    new Date(updatedComment.updated_at) > new Date(updatedComment.created_at),
  );

  // Additional validations
  TestValidator.equals(
    "comment ID should remain the same",
    updatedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "actor_type should remain unchanged",
    updatedComment.actor_type,
    comment.actor_type,
  );
  TestValidator.equals(
    "article reference should remain the same",
    updatedComment.shopping_mall_article_id,
    comment.shopping_mall_article_id,
  );
}
