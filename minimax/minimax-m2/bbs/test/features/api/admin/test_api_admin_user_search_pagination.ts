import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalDiscussionUser";

export async function test_api_admin_user_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as system administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: "System Admin",
        email: adminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create multiple test users by creating articles (each article creation creates a user)
  // Create 50 articles to generate 50 test users for pagination testing
  const testArticles = await ArrayUtil.asyncRepeat(50, async (index) => {
    const article: IEconPoliticalDiscussionArticle =
      await api.functional.econPoliticalDiscussion.articles.create(connection, {
        body: {
          title: `Test Article ${index + 1}`,
          content: RandomGenerator.content({ paragraphs: 2 }),
          category: "Economic Policy",
          econ_political_discussion_user_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          status: "published",
        } satisfies IEconPoliticalDiscussionArticle.ICreate,
      });
    typia.assert(article);
    return article;
  });

  // Step 3: Test default pagination (page 1, limit 20)
  const defaultPageResult: IPageIEconPoliticalDiscussionUser.ISummary =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(defaultPageResult);

  TestValidator.equals(
    "default page should be page 1",
    defaultPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 20",
    defaultPageResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "should have some users",
    defaultPageResult.data.length > 0,
  );
  TestValidator.equals(
    "total pages calculation",
    defaultPageResult.pagination.pages,
    Math.ceil(
      defaultPageResult.pagination.records / defaultPageResult.pagination.limit,
    ),
  );

  // Step 4: Test different limit sizes
  // Test with limit 10 (smaller page size)
  const smallPageResult: IPageIEconPoliticalDiscussionUser.ISummary =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(smallPageResult);
  TestValidator.equals(
    "small page limit should be 10",
    smallPageResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "small page should have fewer users",
    smallPageResult.data.length <= 10,
  );

  // Test with limit 50 (larger page size)
  const largePageResult: IPageIEconPoliticalDiscussionUser.ISummary =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(largePageResult);
  TestValidator.equals(
    "large page limit should be 50",
    largePageResult.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "large page should have more users",
    largePageResult.data.length >= 10,
  );

  // Step 5: Test forward pagination (page 1, 2, 3)
  const page1Result: IPageIEconPoliticalDiscussionUser.ISummary =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(page1Result);

  const page2Result: IPageIEconPoliticalDiscussionUser.ISummary =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 should be current page 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.predicate(
    "page 2 should have different users than page 1",
    page1Result.data.some(
      (user1) => !page2Result.data.some((user2) => user1.id === user2.id),
    ),
  );

  const page3Result: IPageIEconPoliticalDiscussionUser.ISummary =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          page: 3,
          limit: 10,
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(page3Result);
  TestValidator.equals(
    "page 3 should be current page 3",
    page3Result.pagination.current,
    3,
  );

  // Step 6: Test pagination metadata consistency
  TestValidator.equals(
    "total records should be consistent",
    page1Result.pagination.records,
    page2Result.pagination.records,
  );
  TestValidator.equals(
    "total records should be consistent",
    page1Result.pagination.records,
    page3Result.pagination.records,
  );

  // Step 7: Test sorting functionality
  const sortedByName: IPageIEconPoliticalDiscussionUser.ISummary =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          order_by: "display_name",
          order_direction: "asc",
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(sortedByName);
  TestValidator.predicate(
    "users should be sorted by name ascending",
    sortedByName.data.every(
      (user, index, arr) =>
        index === 0 || user.display_name >= arr[index - 1].display_name,
    ),
  );

  // Step 8: Test boundary conditions - non-existent page
  const nonExistentPageResult: IPageIEconPoliticalDiscussionUser.ISummary =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          page: 999,
          limit: 20,
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(nonExistentPageResult);
  TestValidator.equals(
    "non-existent page should return empty data",
    nonExistentPageResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent page should maintain pagination info",
    nonExistentPageResult.pagination.current,
    999,
  );

  // Step 9: Test search functionality with pagination
  const searchResult: IPageIEconPoliticalDiscussionUser.ISummary =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "test",
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search should filter users",
    searchResult.data.length <= defaultPageResult.data.length,
  );

  // Step 10: Verify pagination calculations
  if (defaultPageResult.pagination.records > 0) {
    TestValidator.predicate(
      "pages calculation should be correct",
      defaultPageResult.pagination.pages >= 1,
    );
    TestValidator.equals(
      "last page should be correct",
      defaultPageResult.pagination.pages,
      Math.ceil(
        defaultPageResult.pagination.records /
          defaultPageResult.pagination.limit,
      ),
    );
  }
}
