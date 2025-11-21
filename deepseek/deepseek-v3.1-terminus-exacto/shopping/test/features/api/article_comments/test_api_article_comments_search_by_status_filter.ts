import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticleComment";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import type { IShoppingMallArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleComment";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Test comment search filtering by different moderation statuses
 *
 * This E2E test validates the shopping mall article comment search
 * functionality with comprehensive status-based filtering. It creates comments
 * and tests that the search API correctly handles various moderation status
 * parameters.
 *
 * The test focuses on validating the search functionality with proper status
 * filtering capabilities and pagination behavior.
 */
export async function test_api_article_comments_search_by_status_filter(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for channel and article creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ can_manage_content: true }),
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
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 3: Create article to host comments
  const article = await api.functional.shoppingMall.admin.articles.create(
    connection,
    {
      body: {
        actor_type: "administrator",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        channel_id: channel.id,
        allow_comments: true,
      } satisfies IShoppingMallArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 4: Create customer account for comment creation
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customer123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 5: Create multiple comments for testing
  const commentCount = 4;
  const createdComments: IShoppingMallArticleComment[] = [];

  for (let i = 0; i < commentCount; i++) {
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
    createdComments.push(comment);
  }

  // Step 6: Test search functionality with different status filters
  // Test 6.1: Search all comments (no status filter)
  const allComments = await api.functional.shoppingMall.articles.comments.index(
    connection,
    {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallArticleComment.IRequest,
    },
  );
  typia.assert(allComments);
  TestValidator.equals(
    "all comments should be returned",
    allComments.data.length,
    commentCount,
  );

  // Test 6.2: Search with specific status filter (approved)
  const approvedComments =
    await api.functional.shoppingMall.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
        status: "approved",
      } satisfies IShoppingMallArticleComment.IRequest,
    });
  typia.assert(approvedComments);

  // Verify all returned comments have the filtered status
  for (const comment of approvedComments.data) {
    TestValidator.equals(
      "comment should have approved status",
      comment.status,
      "approved",
    );
  }

  // Test 6.3: Search with pending status filter
  const pendingComments =
    await api.functional.shoppingMall.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
        status: "pending",
      } satisfies IShoppingMallArticleComment.IRequest,
    });
  typia.assert(pendingComments);

  // Test 6.4: Search with rejected status filter
  const rejectedComments =
    await api.functional.shoppingMall.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
        status: "rejected",
      } satisfies IShoppingMallArticleComment.IRequest,
    });
  typia.assert(rejectedComments);

  // Test 6.5: Search with flagged status filter
  const flaggedComments =
    await api.functional.shoppingMall.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
        status: "flagged",
      } satisfies IShoppingMallArticleComment.IRequest,
    });
  typia.assert(flaggedComments);

  // Step 7: Test pagination functionality
  const paginatedComments =
    await api.functional.shoppingMall.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 2,
      } satisfies IShoppingMallArticleComment.IRequest,
    });
  typia.assert(paginatedComments);
  TestValidator.equals(
    "pagination should limit results",
    paginatedComments.data.length,
    2,
  );
  TestValidator.predicate(
    "pagination metadata should be present",
    paginatedComments.pagination.pages > 0,
  );

  // Step 8: Test search with content filtering
  const searchTerm = createdComments[0]?.content.substring(0, 10);
  if (searchTerm) {
    const searchedComments =
      await api.functional.shoppingMall.articles.comments.index(connection, {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          search: searchTerm,
        } satisfies IShoppingMallArticleComment.IRequest,
      });
    typia.assert(searchedComments);
    TestValidator.predicate(
      "search should return matching comments",
      searchedComments.data.length > 0,
    );
  }

  // Step 9: Test actor type filtering
  const customerComments =
    await api.functional.shoppingMall.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
        actor_type: "customer",
      } satisfies IShoppingMallArticleComment.IRequest,
    });
  typia.assert(customerComments);

  for (const comment of customerComments.data) {
    TestValidator.equals(
      "comment should have customer actor type",
      comment.actor_type,
      "customer",
    );
  }

  // Step 10: Test sorting functionality
  const sortedComments =
    await api.functional.shoppingMall.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
      } satisfies IShoppingMallArticleComment.IRequest,
    });
  typia.assert(sortedComments);
  TestValidator.predicate(
    "sorted comments should be returned",
    sortedComments.data.length > 0,
  );
}
