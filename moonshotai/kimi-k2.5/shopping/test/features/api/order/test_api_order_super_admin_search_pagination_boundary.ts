import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_order_super_admin_search_pagination_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Submit initial search request with small limit to force multiple pages
  const limit = 5;
  const firstPage = await api.functional.ecommerceMall.superAdmin.orders.index(
    superAdminConnection,
    {
      body: {
        page: 1,
        limit,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(firstPage);
  // 3. Validate first page response pagination metadata
  TestValidator.equals(
    "first page current pagination",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("first page limit", firstPage.pagination.limit, limit);
  TestValidator.predicate(
    "first page records >= 0",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages >= 0",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page data length <= limit",
    firstPage.data.length <= limit,
  );
  const totalRecords = firstPage.pagination.records;
  const calculatedPages = Math.ceil(totalRecords / limit);
  TestValidator.equals(
    "pages calculation matches",
    firstPage.pagination.pages,
    calculatedPages,
  );
  // Collect all order IDs across pages for duplicate check
  const allOrderIds = new Set<string>();
  firstPage.data.forEach((order) => {
    allOrderIds.add(order.id);
  });
  // 4. Request subsequent pages and verify no duplicates
  if (firstPage.pagination.pages > 1) {
    for (let pageNum = 2; pageNum <= firstPage.pagination.pages; pageNum++) {
      const nextPage =
        await api.functional.ecommerceMall.superAdmin.orders.index(
          superAdminConnection,
          {
            body: {
              page: pageNum,
              limit,
            } satisfies IEcommerceMallOrder.IRequest,
          },
        );
      typia.assert(nextPage);
      // Verify pagination metadata consistency
      TestValidator.equals(
        `page ${pageNum} current pagination`,
        nextPage.pagination.current,
        pageNum,
      );
      TestValidator.equals(
        `page ${pageNum} limit consistent`,
        nextPage.pagination.limit,
        limit,
      );
      TestValidator.equals(
        `page ${pageNum} total records consistent`,
        nextPage.pagination.records,
        totalRecords,
      );
      TestValidator.equals(
        `page ${pageNum} total pages consistent`,
        nextPage.pagination.pages,
        calculatedPages,
      );
      // Verify no duplicates across pages
      nextPage.data.forEach((order) => {
        TestValidator.predicate(
          `order ${order.id} on page ${pageNum} not already seen`,
          !allOrderIds.has(order.id),
        );
        allOrderIds.add(order.id);
      });
    }
  }
  // Verify total count matches collected items
  TestValidator.equals(
    "total collected items matches records",
    allOrderIds.size,
    totalRecords,
  );
  // 5. Test out-of-bounds page boundary
  const outOfBoundsPage = calculatedPages + 1;
  const finalPageResponse =
    await api.functional.ecommerceMall.superAdmin.orders.index(
      superAdminConnection,
      {
        body: {
          page: outOfBoundsPage,
          limit,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(finalPageResponse);
  // 6. Validate out-of-bounds returns empty items array without error
  TestValidator.equals(
    "out-of-bounds page data is empty",
    finalPageResponse.data.length,
    0,
  );
  TestValidator.equals(
    "out-of-bounds page records consistent",
    finalPageResponse.pagination.records,
    totalRecords,
  );
  TestValidator.equals(
    "out-of-bounds page pages consistent",
    finalPageResponse.pagination.pages,
    calculatedPages,
  );
  TestValidator.equals(
    "out-of-bounds page current",
    finalPageResponse.pagination.current,
    outOfBoundsPage,
  );
  TestValidator.equals(
    "out-of-bounds page limit consistent",
    finalPageResponse.pagination.limit,
    limit,
  );
}
