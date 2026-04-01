import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerProfileSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallCustomerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_snapshot_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator Setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Customer Setup
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 3. Create substantial snapshot history (50+ profile updates)
  const updateCount = 55;
  for (let i = 0; i < updateCount; i++) {
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: {
          display_name: `Customer_${RandomGenerator.alphabets(8)}_${i}`,
          phone_number: RandomGenerator.mobile(),
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  }
  // 4. Administrator retrieves snapshots with pagination
  const page = 1;
  const limit = 20;
  const firstPage =
    await api.functional.shoppingMall.administrator.customers.profiles.snapshots.index(
      adminConnection,
      {
        body: {
          page,
          limit,
        } satisfies IShoppingMallCustomerProfileSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  // Validate first page structure
  TestValidator.equals(
    "first page current",
    firstPage.pagination.current,
    page,
  );
  TestValidator.equals("first page limit", firstPage.pagination.limit, limit);
  TestValidator.predicate("first page has data", firstPage.data.length > 0);
  TestValidator.predicate(
    "first page items <= limit",
    firstPage.data.length <= limit,
  );
  // 5. Retrieve all pages and collect all snapshot IDs
  const totalPages = firstPage.pagination.pages;
  const totalRecords = firstPage.pagination.records;
  const allSnapshotIds: string[] = [];
  const allSnapshots: IShoppingMallCustomerProfileSnapshot.ISummary[] = [];
  for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
    const pageResult =
      await api.functional.shoppingMall.administrator.customers.profiles.snapshots.index(
        adminConnection,
        {
          body: {
            page: currentPage,
            limit,
          } satisfies IShoppingMallCustomerProfileSnapshot.IRequest,
        },
      );
    typia.assert(pageResult);
    // Validate pagination metadata
    TestValidator.equals(
      `page ${currentPage} current`,
      pageResult.pagination.current,
      currentPage,
    );
    TestValidator.equals(
      `page ${currentPage} limit`,
      pageResult.pagination.limit,
      limit,
    );
    TestValidator.equals(
      `page ${currentPage} total records`,
      pageResult.pagination.records,
      totalRecords,
    );
    TestValidator.equals(
      `page ${currentPage} total pages`,
      pageResult.pagination.pages,
      totalPages,
    );
    // Collect snapshots
    allSnapshots.push(...pageResult.data);
    pageResult.data.forEach((snapshot) => {
      allSnapshotIds.push(snapshot.id);
    });
    // Validate page size (last page may have fewer items)
    if (currentPage < totalPages) {
      TestValidator.equals(
        `page ${currentPage} full size`,
        pageResult.data.length,
        limit,
      );
    } else {
      const expectedLastPageSize =
        totalRecords % limit === 0 ? limit : totalRecords % limit;
      TestValidator.equals(
        `last page size`,
        pageResult.data.length,
        expectedLastPageSize,
      );
    }
  }
  // 6. Validate completeness - no duplicates, no missing
  const uniqueIds = new Set(allSnapshotIds);
  TestValidator.equals(
    "no duplicate snapshots",
    uniqueIds.size,
    allSnapshotIds.length,
  );
  TestValidator.equals(
    "all snapshots collected",
    allSnapshots.length,
    totalRecords,
  );
  TestValidator.equals(
    "total records matches updates",
    totalRecords,
    updateCount,
  );
  // 7. Verify ordering (created_at DESC - newest first)
  for (let i = 1; i < allSnapshots.length; i++) {
    const prev = allSnapshots[i - 1];
    const curr = allSnapshots[i];
    TestValidator.predicate(
      `snapshot ${i} ordering (newest first)`,
      new Date(prev.createdAt).getTime() >= new Date(curr.createdAt).getTime(),
    );
  }
  // 8. Edge case: Request page beyond total pages
  const outOfRangePage = totalPages + 10;
  const outOfRangeResult =
    await api.functional.shoppingMall.administrator.customers.profiles.snapshots.index(
      adminConnection,
      {
        body: {
          page: outOfRangePage,
          limit,
        } satisfies IShoppingMallCustomerProfileSnapshot.IRequest,
      },
    );
  typia.assert(outOfRangeResult);
  TestValidator.equals(
    "out of range page current",
    outOfRangeResult.pagination.current,
    outOfRangePage,
  );
  TestValidator.equals(
    "out of range page limit",
    outOfRangeResult.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "out of range page records",
    outOfRangeResult.pagination.records,
    totalRecords,
  );
  TestValidator.equals(
    "out of range page pages",
    outOfRangeResult.pagination.pages,
    totalPages,
  );
  TestValidator.equals(
    "out of range page data empty",
    outOfRangeResult.data.length,
    0,
  );
  // 9. Edge case: Test with different limit values
  const smallLimit = 5;
  const smallLimitResult =
    await api.functional.shoppingMall.administrator.customers.profiles.snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: smallLimit,
        } satisfies IShoppingMallCustomerProfileSnapshot.IRequest,
      },
    );
  typia.assert(smallLimitResult);
  TestValidator.equals(
    "small limit page size",
    smallLimitResult.data.length,
    smallLimit,
  );
  const expectedPagesWithSmallLimit = Math.ceil(totalRecords / smallLimit);
  TestValidator.equals(
    "small limit total pages",
    smallLimitResult.pagination.pages,
    expectedPagesWithSmallLimit,
  );
}
