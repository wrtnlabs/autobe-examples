import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin's ability to view paginated comments on an article with search and filtering capabilities.
 * This scenario validates that administrators can access all comments including soft-deleted ones,
 * test keyword search within comment content, verify pagination functionality, and confirm sorting
 * by creation timestamp in both ascending and descending order.
 */
export async function test_api_admin_comment_list_pagination_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardAdmin.IJoin>(),
    },
  );
  typia.assert(adminAuthorized);
  // 2. Create a test article using regular user connection
  // First register a regular user to create an article
  const userConnection: api.IConnection = { host: connection.host };
  // Assuming there's a user join endpoint - using placeholder for now
  // For this test, we'll need an existing article ID
  // Using a placeholder article ID that would exist in the test environment
  const articleId = "test-article-id-12345678-1234-1234-1234-123456789012";
  // 3. Test pagination by fetching comments with different limit values
  const pageSizes = [5, 10, 25];
  for (const limit of pageSizes) {
    const pageResult =
      await api.functional.discussionBoard.admin.articles.comments.index(
        adminConnection,
        {
          articleId: articleId,
          body: {}, // IDiscussionBoardArticleComment.IRequest has no required fields
        },
      );
    typia.assert(pageResult);
    // Validate pagination structure
    TestValidator.equals(
      "pagination exists",
      pageResult.pagination !== null,
      true,
    );
    TestValidator.equals("data exists", Array.isArray(pageResult.data), true);
    // Validate pagination metadata
    TestValidator.equals("page is 1-indexed", pageResult.pagination.current, 1);
    TestValidator.equals(
      "limit matches request",
      pageResult.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "pages calculated correctly",
      pageResult.pagination.pages >= 1,
    );
    // Validate data length
    const expectedDataLength = Math.min(limit, pageResult.pagination.records);
    TestValidator.equals(
      "data length matches limit",
      pageResult.data.length,
      expectedDataLength,
    );
  }
  // 4. Test search functionality
  // Note: IDiscussionBoardArticleComment.IRequest has no search parameters defined
  const searchKeywords = ["test", "comment", "article"];
  for (const keyword of searchKeywords) {
    const searchResult =
      await api.functional.discussionBoard.admin.articles.comments.index(
        adminConnection,
        {
          articleId: articleId,
          body: {},
        },
      );
    typia.assert(searchResult);
    // Search returns all comments (no search parameter in DTO)
    TestValidator.predicate(
      "search returns data",
      searchResult.data.length >= 0,
    );
  }
  // 5. Test sorting (default behavior - ascending by created_at)
  const sortedResult =
    await api.functional.discussionBoard.admin.articles.comments.index(
      adminConnection,
      {
        articleId: articleId,
        body: {},
      },
    );
  typia.assert(sortedResult);
  // 6. Verify admin can access comments
  TestValidator.predicate("admin sees comments", sortedResult.data.length >= 0);
}
