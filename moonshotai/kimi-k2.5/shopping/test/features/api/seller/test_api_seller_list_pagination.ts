import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination behavior when retrieving seller accounts.
 *
 * 1. Authenticate as administrator
 * 2. Test various pagination parameters (page, limit combinations)
 * 3. Verify pagination metadata accuracy (current, limit, records, pages)
 * 4. Test boundary conditions (limit 1, limit 100)
 * 5. Test page beyond available range returns empty data
 * 6. Validate distinct data sets across pages
 */
export async function test_api_seller_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Get first page to establish baseline
  const firstPage = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(firstPage);
  const totalRecords = firstPage.pagination.records;
  // Validate pages calculation on first page
  const expectedFirstPagePages = Math.ceil(totalRecords / 10);
  TestValidator.equals(
    "first page pages calculation",
    firstPage.pagination.pages,
    expectedFirstPagePages,
  );
  // 3. Test boundary limit values (minimum 1)
  const limit1Page = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(limit1Page);
  TestValidator.equals("limit should be 1", limit1Page.pagination.limit, 1);
  TestValidator.predicate("data length <= 1", limit1Page.data.length <= 1);
  // 4. Test boundary limit values (maximum 100)
  const limit100Page = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(limit100Page);
  TestValidator.equals(
    "limit should be 100",
    limit100Page.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data length <= 100",
    limit100Page.data.length <= 100,
  );
  // 5. If records exist, test page navigation and non-overlapping data
  if (totalRecords > 0) {
    // Test page 2 if there are more than 10 records
    if (totalRecords > 10) {
      const page2 = await api.functional.ecommerceMall.sellers.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies IEcommerceMallSeller.IRequest,
        },
      );
      typia.assert(page2);
      TestValidator.equals("page 2 current", page2.pagination.current, 2);
      TestValidator.equals(
        "page 2 records consistency",
        page2.pagination.records,
        totalRecords,
      );
      // Verify pages calculation
      const expectedPages = Math.ceil(totalRecords / 10);
      TestValidator.equals(
        "page 2 pages calculation",
        page2.pagination.pages,
        expectedPages,
      );
      // Verify non-overlapping data between pages
      if (firstPage.data.length > 0 && page2.data.length > 0) {
        const page1Ids = new Set(firstPage.data.map((s) => s.id));
        const page2Ids = new Set(page2.data.map((s) => s.id));
        const hasOverlap = Array.from(page2Ids).some((id) => page1Ids.has(id));
        TestValidator.predicate("no overlapping data", !hasOverlap);
      }
    }
    // Test last page
    const limit = 5;
    const lastPageNum = Math.ceil(totalRecords / limit);
    const lastPage = await api.functional.ecommerceMall.sellers.index(
      adminConnection,
      {
        body: {
          page: lastPageNum,
          limit,
        } satisfies IEcommerceMallSeller.IRequest,
      },
    );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page current",
      lastPage.pagination.current,
      lastPageNum,
    );
    TestValidator.predicate(
      "last page data <= limit",
      lastPage.data.length <= limit,
    );
    TestValidator.equals(
      "last page records consistency",
      lastPage.pagination.records,
      totalRecords,
    );
  }
  // 6. Test page beyond available range
  const farPage = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        page: 9999,
        limit: 10,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(farPage);
  TestValidator.equals("far page empty data", farPage.data.length, 0);
  TestValidator.equals("far page current", farPage.pagination.current, 9999);
  TestValidator.equals(
    "far page records consistency",
    farPage.pagination.records,
    totalRecords,
  );
}
