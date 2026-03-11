import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemMetadatum";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination functionality for system metadata browsing.
 * Validate that admins can control result set size through limit parameter
 * and navigate through pages using page parameter. Test boundary conditions
 * like first page, last page, and pages beyond available data.
 */
export async function test_api_admin_system_metadata_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test different limit values
  const limits = [5, 10, 25] as const;
  for (const limit of limits) {
    const page1 =
      await api.functional.discussionBoard.admin.system_metadata.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: limit,
          } satisfies IDiscussionBoardSystemMetadatum.IRequest,
        },
      );
    typia.assert(page1);
    // Validate pagination metadata
    TestValidator.equals(
      `page 1 limit ${limit} current page`,
      page1.pagination.current,
      1,
    );
    TestValidator.equals(
      `page 1 limit ${limit} limit`,
      page1.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `page 1 limit ${limit} records non-negative`,
      page1.pagination.records >= 0,
    );
    TestValidator.predicate(
      `page 1 limit ${limit} pages non-negative`,
      page1.pagination.pages >= 0,
    );
    // Test page navigation if there are multiple pages
    if (page1.pagination.pages > 1) {
      const page2 =
        await api.functional.discussionBoard.admin.system_metadata.index(
          adminConnection,
          {
            body: {
              page: 2,
              limit: limit,
            } satisfies IDiscussionBoardSystemMetadatum.IRequest,
          },
        );
      typia.assert(page2);
      TestValidator.equals(
        `page 2 limit ${limit} current page`,
        page2.pagination.current,
        2,
      );
      TestValidator.equals(
        `page 2 limit ${limit} limit`,
        page2.pagination.limit,
        limit,
      );
      TestValidator.equals(
        `page 2 limit ${limit} total records`,
        page2.pagination.records,
        page1.pagination.records,
      );
      TestValidator.equals(
        `page 2 limit ${limit} total pages`,
        page2.pagination.pages,
        page1.pagination.pages,
      );
    }
    // Test page beyond available pages
    const beyondPage = page1.pagination.pages + 1;
    const emptyPage =
      await api.functional.discussionBoard.admin.system_metadata.index(
        adminConnection,
        {
          body: {
            page: beyondPage,
            limit: limit,
          } satisfies IDiscussionBoardSystemMetadatum.IRequest,
        },
      );
    typia.assert(emptyPage);
    TestValidator.equals(
      `beyond page limit ${limit} current page`,
      emptyPage.pagination.current,
      beyondPage,
    );
    TestValidator.equals(
      `beyond page limit ${limit} limit`,
      emptyPage.pagination.limit,
      limit,
    );
    TestValidator.equals(
      `beyond page limit ${limit} total records`,
      emptyPage.pagination.records,
      page1.pagination.records,
    );
    TestValidator.equals(
      `beyond page limit ${limit} total pages`,
      emptyPage.pagination.pages,
      page1.pagination.pages,
    );
    TestValidator.equals(
      `beyond page limit ${limit} empty data`,
      emptyPage.data.length,
      0,
    );
  }
  // Test pagination with search filter
  const searchPage =
    await api.functional.discussionBoard.admin.system_metadata.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "test",
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(searchPage);
  TestValidator.equals(
    "search page current page",
    searchPage.pagination.current,
    1,
  );
  TestValidator.equals("search page limit", searchPage.pagination.limit, 10);
  TestValidator.predicate(
    "search page records non-negative",
    searchPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "search page pages non-negative",
    searchPage.pagination.pages >= 0,
  );
  // Test default pagination (no page/limit specified)
  const defaultPage =
    await api.functional.discussionBoard.admin.system_metadata.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page current page",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default page limit positive",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "default page records non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default page pages non-negative",
    defaultPage.pagination.pages >= 0,
  );
}
