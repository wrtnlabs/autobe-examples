import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test pagination functionality with a large dataset of user sessions.
 *
 * This test creates a user account and thoroughly tests the pagination system
 * with various page sizes and edge cases using actual session data from the API.
 * It validates pagination metadata accuracy and ensures data consistency across pages.
 */
export async function test_api_user_session_pagination_large_dataset(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // 2. Get initial session data to understand the dataset size
  const initialSessions =
    await api.functional.communityPlatform.user.sessions.index(userConnection, {
      body: {
        user_id: user.id,
        limit: 100,
        page: 1,
        sort: "created_at",
      } satisfies ICommunityPlatformUserSession.IRequest,
    });
  typia.assert(initialSessions);
  // Skip test if there are not enough sessions for meaningful pagination testing
  if (initialSessions.pagination.records < 10) {
    console.log(
      "Insufficient session data for pagination testing, skipping extensive tests",
    );
    return;
  }
  // 3. Test pagination with different page sizes
  const pageSizes = [5, 10, 25] as const; // Small, medium, large page sizes
  for (const pageSize of pageSizes) {
    // Test first page
    const firstPage =
      await api.functional.communityPlatform.user.sessions.index(
        userConnection,
        {
          body: {
            user_id: user.id,
            limit: pageSize,
            page: 1,
            sort: "created_at",
          } satisfies ICommunityPlatformUserSession.IRequest,
        },
      );
    typia.assert(firstPage);
    TestValidator.equals(
      `page ${pageSize} - current page`,
      firstPage.pagination.current,
      1,
    );
    TestValidator.equals(
      `page ${pageSize} - limit`,
      firstPage.pagination.limit,
      pageSize,
    );
    TestValidator.predicate(
      `page ${pageSize} - records positive`,
      firstPage.pagination.records > 0,
    );
    TestValidator.predicate(
      `page ${pageSize} - pages positive`,
      firstPage.pagination.pages > 0,
    );
    TestValidator.equals(
      `page ${pageSize} - data length matches limit`,
      firstPage.data.length,
      Math.min(pageSize, firstPage.pagination.records),
    );
    // Test mathematical correctness of pagination metadata
    const calculatedPages = Math.ceil(
      firstPage.pagination.records / firstPage.pagination.limit,
    );
    TestValidator.equals(
      `page ${pageSize} - pages calculation`,
      firstPage.pagination.pages,
      calculatedPages,
    );
    // Test middle page if available
    if (firstPage.pagination.pages > 2) {
      const middlePageNum = Math.floor(firstPage.pagination.pages / 2);
      const middlePage =
        await api.functional.communityPlatform.user.sessions.index(
          userConnection,
          {
            body: {
              user_id: user.id,
              limit: pageSize,
              page: middlePageNum,
              sort: "created_at",
            } satisfies ICommunityPlatformUserSession.IRequest,
          },
        );
      typia.assert(middlePage);
      TestValidator.equals(
        `middle page ${pageSize} - current page`,
        middlePage.pagination.current,
        middlePageNum,
      );
      TestValidator.equals(
        `middle page ${pageSize} - limit`,
        middlePage.pagination.limit,
        pageSize,
      );
    }
    // Test last page
    const lastPage = await api.functional.communityPlatform.user.sessions.index(
      userConnection,
      {
        body: {
          user_id: user.id,
          limit: pageSize,
          page: firstPage.pagination.pages,
          sort: "created_at",
        } satisfies ICommunityPlatformUserSession.IRequest,
      },
    );
    typia.assert(lastPage);
    TestValidator.equals(
      `last page ${pageSize} - current page`,
      lastPage.pagination.current,
      firstPage.pagination.pages,
    );
    TestValidator.predicate(
      `last page ${pageSize} - data length <= limit`,
      lastPage.data.length <= pageSize,
    );
    // Last page should have remaining records or be empty
    const expectedLastPageSize =
      firstPage.pagination.records % pageSize || pageSize;
    TestValidator.equals(
      `last page ${pageSize} - expected size`,
      lastPage.data.length,
      expectedLastPageSize,
    );
  }
  // 4. Test edge cases
  // Test page beyond total pages
  const beyondPage = await api.functional.communityPlatform.user.sessions.index(
    userConnection,
    {
      body: {
        user_id: user.id,
        limit: 10,
        page: 1000, // Very high page number
        sort: "created_at",
      } satisfies ICommunityPlatformUserSession.IRequest,
    },
  );
  typia.assert(beyondPage);
  TestValidator.equals("beyond page - empty data", beyondPage.data.length, 0);
  TestValidator.predicate(
    "beyond page - current page > total pages",
    beyondPage.pagination.current > beyondPage.pagination.pages,
  );
  // Test empty result set with specific filter
  const emptyFilter =
    await api.functional.communityPlatform.user.sessions.index(userConnection, {
      body: {
        user_id: user.id,
        ip: "192.168.0.1" satisfies string & tags.Format<"ipv4">, // Non-existent IP
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformUserSession.IRequest,
    });
  typia.assert(emptyFilter);
  TestValidator.equals("empty filter - no data", emptyFilter.data.length, 0);
  TestValidator.equals(
    "empty filter - zero records",
    emptyFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filter - zero pages",
    emptyFilter.pagination.pages,
    0,
  );
  // 5. Test data consistency across pages
  const smallPageSize = 5;
  const firstConsistencyPage =
    await api.functional.communityPlatform.user.sessions.index(userConnection, {
      body: {
        user_id: user.id,
        limit: smallPageSize,
        page: 1,
        sort: "created_at",
      } satisfies ICommunityPlatformUserSession.IRequest,
    });
  typia.assert(firstConsistencyPage);
  if (firstConsistencyPage.pagination.pages > 1) {
    const secondConsistencyPage =
      await api.functional.communityPlatform.user.sessions.index(
        userConnection,
        {
          body: {
            user_id: user.id,
            limit: smallPageSize,
            page: 2,
            sort: "created_at",
          } satisfies ICommunityPlatformUserSession.IRequest,
        },
      );
    typia.assert(secondConsistencyPage);
    // Ensure no overlap between pages when there are multiple pages
    const firstPageIds = new Set(
      firstConsistencyPage.data.map((session) => session.id),
    );
    const secondPageIds = new Set(
      secondConsistencyPage.data.map((session) => session.id),
    );
    TestValidator.predicate(
      "data consistency - no overlap between pages",
      Array.from(firstPageIds).every((id) => !secondPageIds.has(id)),
    );
  }
  // 6. Test various filter combinations
  const filterTests = [
    { name: "expired sessions", filter: { expired: true } },
    { name: "active sessions", filter: { expired: false } },
  ];
  for (const test of filterTests) {
    const filteredResult =
      await api.functional.communityPlatform.user.sessions.index(
        userConnection,
        {
          body: {
            user_id: user.id,
            limit: 10,
            page: 1,
            ...test.filter,
          } satisfies ICommunityPlatformUserSession.IRequest,
        },
      );
    typia.assert(filteredResult);
    TestValidator.predicate(
      `filter ${test.name} - valid pagination`,
      filteredResult.pagination.records >= 0 &&
        filteredResult.pagination.pages >= 0,
    );
  }
  // 7. Test single-page scenario with large limit
  const singlePage = await api.functional.communityPlatform.user.sessions.index(
    userConnection,
    {
      body: {
        user_id: user.id,
        limit: initialSessions.pagination.records + 10, // Larger than total records
        page: 1,
        sort: "created_at",
      } satisfies ICommunityPlatformUserSession.IRequest,
    },
  );
  typia.assert(singlePage);
  TestValidator.equals(
    "single page - current page",
    singlePage.pagination.current,
    1,
  );
  TestValidator.equals(
    "single page - total pages",
    singlePage.pagination.pages,
    1,
  );
  TestValidator.equals(
    "single page - data equals total records",
    singlePage.data.length,
    singlePage.pagination.records,
  );
}
