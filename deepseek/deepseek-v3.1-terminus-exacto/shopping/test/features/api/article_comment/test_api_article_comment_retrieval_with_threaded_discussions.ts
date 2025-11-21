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
 * Test retrieving comments within threaded discussion hierarchies
 *
 * This test validates the comment retrieval functionality by creating a complex
 * threaded discussion structure with parent comments and nested replies at
 * different depth levels. It ensures that individual comment retrieval
 * correctly preserves hierarchical relationships, depth tracking, and all
 * comment properties.
 */
export async function test_api_article_comment_retrieval_with_threaded_discussions(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123456";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: "Admin",
      last_name: "User",
      role: "super_admin",
      permissions: JSON.stringify({ access_level: "full" }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create shopping mall channel
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

  // Step 3: Create article
  const article = await api.functional.shoppingMall.admin.articles.create(
    connection,
    {
      body: {
        actor_type: "administrator",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        subtitle: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        featured: true,
        allow_comments: true,
        channel_id: channel.id,
      } satisfies IShoppingMallArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 4: Create customer account and authenticate
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customer123456";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: "Customer",
      last_name: "User",
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 5: Create threaded comment hierarchy
  // Create parent comment (depth 0)
  const parentComment =
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
  typia.assert(parentComment);

  // Create first-level reply (depth 1)
  const firstLevelReply =
    await api.functional.shoppingMall.customer.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.content({ paragraphs: 1 }),
          parent: {
            id: parentComment.id,
            content: parentComment.content,
            status: parentComment.status,
            like_count: parentComment.like_count,
            report_count: parentComment.report_count,
            depth: parentComment.depth,
            actor_type: parentComment.actor_type,
          } satisfies IShoppingMallArticleComment.ISummary,
          actor_type: "customer",
        } satisfies IShoppingMallArticleComment.ICreate,
      },
    );
  typia.assert(firstLevelReply);

  // Create second-level reply (depth 2)
  const secondLevelReply =
    await api.functional.shoppingMall.customer.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.content({ paragraphs: 1 }),
          parent: {
            id: firstLevelReply.id,
            content: firstLevelReply.content,
            status: firstLevelReply.status,
            like_count: firstLevelReply.like_count,
            report_count: firstLevelReply.report_count,
            depth: firstLevelReply.depth,
            actor_type: firstLevelReply.actor_type,
          } satisfies IShoppingMallArticleComment.ISummary,
          actor_type: "customer",
        } satisfies IShoppingMallArticleComment.ICreate,
      },
    );
  typia.assert(secondLevelReply);

  // Step 6: Test retrieval of individual comments
  // Retrieve parent comment
  const retrievedParent =
    await api.functional.shoppingMall.articles.comments.at(connection, {
      articleId: article.id,
      commentId: parentComment.id,
    });
  typia.assert(retrievedParent);

  TestValidator.equals(
    "parent comment ID should match created comment",
    retrievedParent.id,
    parentComment.id,
  );
  TestValidator.equals(
    "parent comment content should match original",
    retrievedParent.content,
    parentComment.content,
  );
  TestValidator.equals(
    "parent comment depth should be 0",
    retrievedParent.depth,
    0,
  );
  TestValidator.equals(
    "parent comment actor type should be customer",
    retrievedParent.actor_type,
    "customer",
  );
  TestValidator.equals(
    "parent comment should not have parent reference",
    retrievedParent.parent,
    undefined,
  );

  // Retrieve first-level reply
  const retrievedFirstLevel =
    await api.functional.shoppingMall.articles.comments.at(connection, {
      articleId: article.id,
      commentId: firstLevelReply.id,
    });
  typia.assert(retrievedFirstLevel);

  TestValidator.equals(
    "first-level reply ID should match created comment",
    retrievedFirstLevel.id,
    firstLevelReply.id,
  );
  TestValidator.equals(
    "first-level reply content should match original",
    retrievedFirstLevel.content,
    firstLevelReply.content,
  );
  TestValidator.equals(
    "first-level reply depth should be 1",
    retrievedFirstLevel.depth,
    1,
  );
  TestValidator.equals(
    "first-level reply should reference parent comment",
    retrievedFirstLevel.parent?.id,
    parentComment.id,
  );

  // Retrieve second-level reply
  const retrievedSecondLevel =
    await api.functional.shoppingMall.articles.comments.at(connection, {
      articleId: article.id,
      commentId: secondLevelReply.id,
    });
  typia.assert(retrievedSecondLevel);

  TestValidator.equals(
    "second-level reply ID should match created comment",
    retrievedSecondLevel.id,
    secondLevelReply.id,
  );
  TestValidator.equals(
    "second-level reply content should match original",
    retrievedSecondLevel.content,
    secondLevelReply.content,
  );
  TestValidator.equals(
    "second-level reply depth should be 2",
    retrievedSecondLevel.depth,
    2,
  );
  TestValidator.equals(
    "second-level reply should reference first-level reply",
    retrievedSecondLevel.parent?.id,
    firstLevelReply.id,
  );

  // Step 7: Validate hierarchical relationships
  TestValidator.equals(
    "second-level reply parent should be first-level reply",
    retrievedSecondLevel.parent?.id,
    firstLevelReply.id,
  );
  TestValidator.equals(
    "first-level reply parent should be parent comment",
    retrievedFirstLevel.parent?.id,
    parentComment.id,
  );

  // Step 8: Validate comment properties are preserved
  TestValidator.equals(
    "parent comment status should be approved",
    retrievedParent.status,
    "approved",
  );
  TestValidator.equals(
    "first-level reply status should be approved",
    retrievedFirstLevel.status,
    "approved",
  );
  TestValidator.equals(
    "second-level reply status should be approved",
    retrievedSecondLevel.status,
    "approved",
  );

  TestValidator.equals(
    "parent comment should have zero likes initially",
    retrievedParent.like_count,
    0,
  );
  TestValidator.equals(
    "first-level reply should have zero likes initially",
    retrievedFirstLevel.like_count,
    0,
  );
  TestValidator.equals(
    "second-level reply should have zero likes initially",
    retrievedSecondLevel.like_count,
    0,
  );

  TestValidator.equals(
    "parent comment should have zero reports initially",
    retrievedParent.report_count,
    0,
  );
  TestValidator.equals(
    "first-level reply should have zero reports initially",
    retrievedFirstLevel.report_count,
    0,
  );
  TestValidator.equals(
    "second-level reply should have zero reports initially",
    retrievedSecondLevel.report_count,
    0,
  );

  // Step 9: Validate article reference
  TestValidator.equals(
    "retrieved comment should reference correct article",
    retrievedParent.shopping_mall_article_id,
    article.id,
  );
}
