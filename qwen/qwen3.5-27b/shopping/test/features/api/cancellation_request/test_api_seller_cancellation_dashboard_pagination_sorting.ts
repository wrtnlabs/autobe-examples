import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test pagination and sorting functionality for the seller cancellation requests dashboard.
 *
 * This test validates:
 * 1. Default pagination behavior (page=1, limit=20)
 * 2. Custom page size configuration
 * 3. Page navigation across multiple pages
 * 4. Sorting by requested_at in both ascending and descending order
 * 5. Date range filtering capabilities
 * 6. Maximum limit handling (100 items)
 */
export async function test_api_seller_cancellation_dashboard_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com",
    },
  });
  typia.assert(adminJoin);
  // 2. Setup: Register a seller account
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      shop_name: "Test Shop",
      shop_description: "Test shop for cancellation requests",
      href: "https://test.com/seller/join",
      referrer: "https://test.com",
    },
  });
  typia.assert(sellerJoin);
  // 3. Setup: Authenticate as the seller
  // Note: In a real test environment, the seller should be pre-approved by admin
  // or we would need to call the admin approval endpoint here
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      href: "https://test.com/seller/login",
      referrer: "https://test.com",
    },
  });
  // Test Case 1: Default pagination (page=1, limit=20)
  const defaultPage =
    await api.functional.shoppingMall.seller.cancellation_requests.dashboard.index(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals("default page", defaultPage.pagination.current, 1);
  TestValidator.equals("default limit", defaultPage.pagination.limit, 20);
  TestValidator.predicate(
    "has non-negative records",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data length within bounds",
    defaultPage.data.length <= defaultPage.pagination.limit &&
      defaultPage.data.length <= defaultPage.pagination.records,
  );
  // Test Case 2: Custom page size (limit=10)
  const customLimitPage =
    await api.functional.shoppingMall.seller.cancellation_requests.dashboard.index(
      sellerConnection,
      {
        body: {
          limit: 10,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(customLimitPage);
  TestValidator.equals("custom limit", customLimitPage.pagination.limit, 10);
  TestValidator.equals(
    "custom limit page",
    customLimitPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data length matches custom limit",
    customLimitPage.data.length <= 10,
  );
  // Test Case 3: Navigate to page 2 with limit=10
  const page2 =
    await api.functional.shoppingMall.seller.cancellation_requests.dashboard.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  // Verify page 2 has different data than page 1 (if both pages have data)
  if (customLimitPage.data.length > 0 && page2.data.length > 0) {
    const page1Ids = customLimitPage.data.map((d) => d.id);
    const page2Ids = page2.data.map((d) => d.id);
    const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
    TestValidator.predicate("no overlap between pages", !hasOverlap);
  }
  // Test Case 4: Sort by requested_at DESC (newest first)
  const sortedDesc =
    await api.functional.shoppingMall.seller.cancellation_requests.dashboard.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "requested_at",
          sortOrder: "desc",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(sortedDesc);
  TestValidator.equals(
    "sort order desc page",
    sortedDesc.pagination.current,
    1,
  );
  // Verify descending order (if we have multiple items)
  if (sortedDesc.data.length >= 2) {
    for (let i = 1; i < sortedDesc.data.length; i++) {
      const prevDate = new Date(sortedDesc.data[i - 1].requestedAt).getTime();
      const currDate = new Date(sortedDesc.data[i].requestedAt).getTime();
      TestValidator.predicate(
        `item ${i - 1} >= item ${i} in DESC order`,
        prevDate >= currDate,
      );
    }
  }
  // Test Case 5: Sort by requested_at ASC (oldest first)
  const sortedAsc =
    await api.functional.shoppingMall.seller.cancellation_requests.dashboard.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "requested_at",
          sortOrder: "asc",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(sortedAsc);
  TestValidator.equals("sort order asc page", sortedAsc.pagination.current, 1);
  // Verify ascending order (if we have multiple items)
  if (sortedAsc.data.length >= 2) {
    for (let i = 1; i < sortedAsc.data.length; i++) {
      const prevDate = new Date(sortedAsc.data[i - 1].requestedAt).getTime();
      const currDate = new Date(sortedAsc.data[i].requestedAt).getTime();
      TestValidator.predicate(
        `item ${i - 1} <= item ${i} in ASC order`,
        prevDate <= currDate,
      );
    }
  }
  // Test Case 6: Date range filter
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const filteredByDate =
    await api.functional.shoppingMall.seller.cancellation_requests.dashboard.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          requested_at_from: oneYearAgo.toISOString(),
          requested_at_to: now.toISOString(),
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(filteredByDate);
  TestValidator.equals(
    "date filter page",
    filteredByDate.pagination.current,
    1,
  );
  // Verify all items are within the date range (if there are items)
  if (filteredByDate.data.length > 0) {
    for (const item of filteredByDate.data) {
      const itemDate = new Date(item.requestedAt).getTime();
      TestValidator.predicate(
        `item ${item.id} within date range`,
        itemDate >= oneYearAgo.getTime() && itemDate <= now.getTime(),
      );
    }
  }
  // Test Case 7: Maximum limit (limit=100)
  const maxLimit =
    await api.functional.shoppingMall.seller.cancellation_requests.dashboard.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(maxLimit);
  TestValidator.equals("max limit", maxLimit.pagination.limit, 100);
  TestValidator.equals("max limit page", maxLimit.pagination.current, 1);
  TestValidator.predicate(
    "data length within max limit",
    maxLimit.data.length <= 100,
  );
  // Additional validation: Verify pagination metadata consistency
  const expectedPages =
    maxLimit.pagination.limit > 0
      ? Math.ceil(maxLimit.pagination.records / maxLimit.pagination.limit)
      : 0;
  TestValidator.predicate(
    "pages calculation correct",
    maxLimit.pagination.pages === expectedPages,
  );
}
