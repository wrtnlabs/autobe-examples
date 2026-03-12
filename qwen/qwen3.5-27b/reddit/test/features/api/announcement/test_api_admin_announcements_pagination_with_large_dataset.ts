import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneAnnouncement";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAnnouncement";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination functionality for admin announcements query with large datasets.
 * Validates pagination metadata accuracy, data consistency across pages, and edge case handling.
 */
export async function test_api_admin_announcements_pagination_with_large_dataset(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin Authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Test default pagination (page 1, limit 20)
  const defaultPage =
    await api.functional.redditClone.admin.announcements.index(
      adminConnection,
      {
        body: {} satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default current page",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals("default limit", defaultPage.pagination.limit, 20);
  TestValidator.predicate(
    "default has non-negative records",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default has valid pages",
    defaultPage.pagination.pages >= 0,
  );
  // 3. Test custom page sizes
  // Limit 10
  const pageLimit10 =
    await api.functional.redditClone.admin.announcements.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(pageLimit10);
  TestValidator.equals(
    "limit 10 current page",
    pageLimit10.pagination.current,
    1,
  );
  TestValidator.equals("limit 10 limit", pageLimit10.pagination.limit, 10);
  TestValidator.equals(
    "limit 10 records match default",
    pageLimit10.pagination.records,
    defaultPage.pagination.records,
  );
  // Limit 50
  const pageLimit50 =
    await api.functional.redditClone.admin.announcements.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(pageLimit50);
  TestValidator.equals(
    "limit 50 current page",
    pageLimit50.pagination.current,
    1,
  );
  TestValidator.equals("limit 50 limit", pageLimit50.pagination.limit, 50);
  TestValidator.equals(
    "limit 50 records match default",
    pageLimit50.pagination.records,
    defaultPage.pagination.records,
  );
  // Limit 100
  const pageLimit100 =
    await api.functional.redditClone.admin.announcements.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(pageLimit100);
  TestValidator.equals(
    "limit 100 current page",
    pageLimit100.pagination.current,
    1,
  );
  TestValidator.equals("limit 100 limit", pageLimit100.pagination.limit, 100);
  TestValidator.equals(
    "limit 100 records match default",
    pageLimit100.pagination.records,
    defaultPage.pagination.records,
  );
  // 4. Test multi-page navigation
  const totalPages = defaultPage.pagination.pages;
  let page2: IPageIRedditCloneAnnouncement.ISummary | undefined = undefined;
  if (totalPages >= 2) {
    // Page 2 with limit 20
    page2 = await api.functional.redditClone.admin.announcements.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.equals("page 2 current", page2.pagination.current, 2);
    TestValidator.equals("page 2 limit", page2.pagination.limit, 20);
    TestValidator.equals(
      "page 2 records match default",
      page2.pagination.records,
      defaultPage.pagination.records,
    );
    TestValidator.equals(
      "page 2 pages match default",
      page2.pagination.pages,
      defaultPage.pagination.pages,
    );
    // Verify no duplicate IDs between page 1 and page 2
    const page1Ids = new Set(defaultPage.data.map((a) => a.id));
    const page2Ids = new Set(page2.data.map((a) => a.id));
    const hasDuplicates = Array.from(page1Ids).some((id) => page2Ids.has(id));
    TestValidator.predicate(
      "no duplicates between page 1 and 2",
      !hasDuplicates,
    );
    // Page 3 if available
    if (totalPages >= 3) {
      const page3 = await api.functional.redditClone.admin.announcements.index(
        adminConnection,
        {
          body: {
            page: 3,
            limit: 20,
          } satisfies IRedditCloneAnnouncement.IRequest,
        },
      );
      typia.assert(page3);
      TestValidator.equals("page 3 current", page3.pagination.current, 3);
      TestValidator.equals("page 3 limit", page3.pagination.limit, 20);
      TestValidator.equals(
        "page 3 records match default",
        page3.pagination.records,
        defaultPage.pagination.records,
      );
      // Verify no duplicates between page 2 and page 3
      const page3Ids = new Set(page3.data.map((a) => a.id));
      const hasDuplicates2 = Array.from(page2Ids).some((id) =>
        page3Ids.has(id),
      );
      TestValidator.predicate(
        "no duplicates between page 2 and 3",
        !hasDuplicates2,
      );
    }
  }
  // 5. Test edge case: page beyond available pages
  const beyondPage = await api.functional.redditClone.admin.announcements.index(
    adminConnection,
    {
      body: {
        page: totalPages + 1,
        limit: 20,
      } satisfies IRedditCloneAnnouncement.IRequest,
    },
  );
  typia.assert(beyondPage);
  TestValidator.equals(
    "beyond page current",
    beyondPage.pagination.current,
    totalPages + 1,
  );
  TestValidator.equals("beyond page limit", beyondPage.pagination.limit, 20);
  TestValidator.equals("beyond page has empty data", beyondPage.data.length, 0);
  TestValidator.equals(
    "beyond page records match default",
    beyondPage.pagination.records,
    defaultPage.pagination.records,
  );
  // 6. Test edge case: page 0 (should be handled appropriately)
  const page0 = await api.functional.redditClone.admin.announcements.index(
    adminConnection,
    {
      body: {
        page: 0,
        limit: 20,
      } satisfies IRedditCloneAnnouncement.IRequest,
    },
  );
  typia.assert(page0);
  // Page 0 should either return page 1 data or empty data depending on implementation
  TestValidator.predicate("page 0 handled", page0.pagination.current >= 0);
  // 7. Verify pagination calculation: pages = ceiling(records / limit)
  if (defaultPage.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      defaultPage.pagination.records / defaultPage.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation correct",
      defaultPage.pagination.pages,
      expectedPages,
    );
  }
  // 8. Test sorting consistency across pages
  if (defaultPage.data.length > 0 && page2 !== undefined) {
    const page1LastCreatedAt =
      defaultPage.data[defaultPage.data.length - 1].createdAt;
    const page2FirstCreatedAt = page2.data[0].createdAt;
    // When sorted by createdAt descending (default), page 2 should have older or equal dates
    TestValidator.predicate(
      "sorting consistent across pages",
      new Date(page2FirstCreatedAt).getTime() <=
        new Date(page1LastCreatedAt).getTime(),
    );
  }
}
