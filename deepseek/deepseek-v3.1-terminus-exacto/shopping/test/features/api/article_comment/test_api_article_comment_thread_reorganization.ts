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
 * Test comment thread reorganization by updating parent references.
 *
 * This E2E test validates the ability to move comments within threaded
 * discussion hierarchies, ensuring proper depth recalculation, thread integrity
 * maintenance, and nesting display updates. The test covers the complete
 * workflow from user authentication to comment creation and reorganization.
 *
 * Business logic validation includes preventing circular references,
 * maintaining conversation context, and ensuring proper hierarchical
 * organization.
 *
 * Test workflow:
 *
 * 1. Create customer account for authentication context
 * 2. Create admin account for channel management
 * 3. Create shopping channel as prerequisite for article creation
 * 4. Create article to host comments
 * 5. Create initial comment hierarchy with multiple levels
 * 6. Reorganize comment thread by updating parent references
 * 7. Validate depth recalculation and thread integrity
 * 8. Verify proper nesting display updates
 */
export async function test_api_article_comment_thread_reorganization(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "testPassword123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create admin account for channel management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPassword123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
      permissions: JSON.stringify({ canManageChannels: true }),
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

  // Step 4: Create article to host comments
  const article = await api.functional.shoppingMall.customer.articles.create(
    connection,
    {
      body: {
        actor_type: "customer",
        title: RandomGenerator.paragraph({ sentences: 5 }),
        subtitle: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 3 }),
        featured: false,
        allow_comments: true,
        channel_id: channel.id,
      } satisfies IShoppingMallArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Create initial comment hierarchy with multiple levels
  // Create root comment
  const rootComment =
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
  typia.assert(rootComment);

  // Create first-level reply to root comment
  const firstLevelReply =
    await api.functional.shoppingMall.customer.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.content({ paragraphs: 1 }),
          parent: rootComment satisfies IShoppingMallArticleComment.ISummary,
          actor_type: "customer",
        } satisfies IShoppingMallArticleComment.ICreate,
      },
    );
  typia.assert(firstLevelReply);

  // Create second-level reply (nested under first-level reply)
  const secondLevelReply =
    await api.functional.shoppingMall.customer.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.content({ paragraphs: 1 }),
          parent:
            firstLevelReply satisfies IShoppingMallArticleComment.ISummary,
          actor_type: "customer",
        } satisfies IShoppingMallArticleComment.ICreate,
      },
    );
  typia.assert(secondLevelReply);

  // Create another first-level reply to root comment
  const anotherFirstLevelReply =
    await api.functional.shoppingMall.customer.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.content({ paragraphs: 1 }),
          parent: rootComment satisfies IShoppingMallArticleComment.ISummary,
          actor_type: "customer",
        } satisfies IShoppingMallArticleComment.ICreate,
      },
    );
  typia.assert(anotherFirstLevelReply);

  // Validate initial depth hierarchy
  TestValidator.equals(
    "root comment should have depth 0",
    rootComment.depth,
    0,
  );
  TestValidator.equals(
    "first level reply should have depth 1",
    firstLevelReply.depth,
    1,
  );
  TestValidator.equals(
    "second level reply should have depth 2",
    secondLevelReply.depth,
    2,
  );
  TestValidator.equals(
    "another first level reply should have depth 1",
    anotherFirstLevelReply.depth,
    1,
  );

  // Step 6: Reorganize comment thread by moving second-level reply to become direct reply to root
  const reorganizedComment =
    await api.functional.shoppingMall.customer.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: secondLevelReply.id,
        body: {
          parent: rootComment satisfies IShoppingMallArticleComment.ISummary,
        } satisfies IShoppingMallArticleComment.IUpdate,
      },
    );
  typia.assert(reorganizedComment);

  // Step 7: Validate depth recalculation and thread integrity
  TestValidator.equals(
    "reorganized comment should have depth 1 (direct reply to root)",
    reorganizedComment.depth,
    1,
  );

  TestValidator.equals(
    "reorganized comment ID should remain the same",
    reorganizedComment.id,
    secondLevelReply.id,
  );

  TestValidator.equals(
    "reorganized comment content should remain unchanged",
    reorganizedComment.content,
    secondLevelReply.content,
  );

  // Step 8: Verify proper nesting display updates
  TestValidator.predicate(
    "reorganized comment should have valid parent reference",
    reorganizedComment.parent !== undefined,
  );

  TestValidator.equals(
    "reorganized comment parent should be the root comment",
    reorganizedComment.parent?.id,
    rootComment.id,
  );

  // Validate that the original parent-child relationship is broken
  TestValidator.notEquals(
    "reorganized comment should no longer have firstLevelReply as parent",
    reorganizedComment.parent?.id,
    firstLevelReply.id,
  );

  // Validate thread integrity by ensuring no circular references
  TestValidator.predicate(
    "no comment should be its own parent",
    [
      rootComment,
      firstLevelReply,
      reorganizedComment,
      anotherFirstLevelReply,
    ].every((comment) => comment.parent?.id !== comment.id),
  );

  // Validate that all comments maintain proper article association
  TestValidator.equals(
    "all comments should belong to the same article",
    [
      rootComment,
      firstLevelReply,
      reorganizedComment,
      anotherFirstLevelReply,
    ].every((comment) => comment.shopping_mall_article_id === article.id),
    true,
  );

  // Final validation of comment status and actor type
  TestValidator.predicate(
    "all comments should have valid status",
    [
      rootComment,
      firstLevelReply,
      reorganizedComment,
      anotherFirstLevelReply,
    ].every(
      (comment) =>
        comment.status === "approved" || comment.status === "pending",
    ),
  );

  TestValidator.equals(
    "all comments should have customer actor type",
    [
      rootComment,
      firstLevelReply,
      reorganizedComment,
      anotherFirstLevelReply,
    ].every((comment) => comment.actor_type === "customer"),
    true,
  );
}
