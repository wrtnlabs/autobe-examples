import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that the refund request snapshots endpoint correctly handles pagination with large datasets.
 *
 * Validates the complete pagination workflow for refund request snapshots including pagination metadata accuracy, boundary conditions, and consistent sorting order. Ensures that the endpoint correctly returns paginated results with accurate metadata across multiple pages.
 *
 * Special attention is given to verifying pagination metadata (current page, limit, total records, total pages) and ensuring consistent sorting order (newest first) across all pages. Tests edge cases including empty pages beyond available data and maximum limit handling.
 *
 * 1. Register and authenticate as a customer.
 * 2. Register and authenticate as three sellers (for actor setup).
 * 3. Call endpoint with page=1, limit=10 and verify pagination metadata.
 * 4. Call endpoint with page=2, limit=10 and verify pagination metadata.
 * 5. Call endpoint with page=3, limit=10 and verify pagination metadata.
 * 6. Call endpoint with page=4, limit=10 (beyond available pages) and verify empty results.
 * 7. Call endpoint with limit=100 (maximum) and verify all records returned.
 * 8. Verify no duplicate snapshots across pages.
 * 9. Verify consistent sorting order (newest first) across all pages.
 */
export async function test_api_refund_request_snapshots_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Register and authenticate three sellers (for actor setup)
  const seller1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const seller3Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Test pagination: page=1, limit=10
  const page1 =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 data count", page1.data.length, 10);
  TestValidator.equals(
    "page 1 pagination current",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 pagination limit", page1.pagination.limit, 10);
  TestValidator.equals(
    "page 1 pagination records",
    page1.pagination.records,
    25,
  );
  TestValidator.equals("page 1 pagination pages", page1.pagination.pages, 3);
  // 4. Test pagination: page=2, limit=10
  const page2 =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 data count", page2.data.length, 10);
  TestValidator.equals(
    "page 2 pagination current",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 pagination limit", page2.pagination.limit, 10);
  TestValidator.equals(
    "page 2 pagination records",
    page2.pagination.records,
    25,
  );
  TestValidator.equals("page 2 pagination pages", page2.pagination.pages, 3);
  // 5. Test pagination: page=3, limit=10
  const page3 =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        body: {
          page: 3,
          limit: 10,
        },
      },
    );
  typia.assert(page3);
  TestValidator.equals("page 3 data count", page3.data.length, 5);
  TestValidator.equals(
    "page 3 pagination current",
    page3.pagination.current,
    3,
  );
  TestValidator.equals("page 3 pagination limit", page3.pagination.limit, 10);
  TestValidator.equals(
    "page 3 pagination records",
    page3.pagination.records,
    25,
  );
  TestValidator.equals("page 3 pagination pages", page3.pagination.pages, 3);
  // 6. Test pagination: page=4, limit=10 (beyond available pages)
  const page4 =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        body: {
          page: 4,
          limit: 10,
        },
      },
    );
  typia.assert(page4);
  TestValidator.equals("page 4 data count (empty)", page4.data.length, 0);
  TestValidator.equals(
    "page 4 pagination current",
    page4.pagination.current,
    4,
  );
  TestValidator.equals("page 4 pagination limit", page4.pagination.limit, 10);
  TestValidator.equals(
    "page 4 pagination records",
    page4.pagination.records,
    25,
  );
  TestValidator.equals("page 4 pagination pages", page4.pagination.pages, 3);
  // 7. Test pagination: limit=100 (maximum)
  const maxLimit =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(maxLimit);
  TestValidator.equals("max limit data count", maxLimit.data.length, 25);
  TestValidator.equals(
    "max limit pagination current",
    maxLimit.pagination.current,
    1,
  );
  TestValidator.equals(
    "max limit pagination limit",
    maxLimit.pagination.limit,
    100,
  );
  TestValidator.equals(
    "max limit pagination records",
    maxLimit.pagination.records,
    25,
  );
  TestValidator.equals(
    "max limit pagination pages",
    maxLimit.pagination.pages,
    1,
  );
  // 8. Verify no duplicate snapshots across pages
  const allSnapshotIds = [
    ...page1.data.map((s) => s.id),
    ...page2.data.map((s) => s.id),
    ...page3.data.map((s) => s.id),
  ];
  const uniqueSnapshotIds = [...new Set(allSnapshotIds)];
  TestValidator.equals(
    "no duplicate snapshots",
    uniqueSnapshotIds.length,
    allSnapshotIds.length,
  );
  // 9. Verify consistent sorting order (newest first)
  TestValidator.predicate(
    "page 1 sorted by created_at descending",
    page1.data.every((snapshot, i, arr) =>
      i === 0
        ? true
        : new Date(arr[i - 1].created_at) >= new Date(snapshot.created_at),
    ),
  );
  TestValidator.predicate(
    "page 2 sorted by created_at descending",
    page2.data.every((snapshot, i, arr) =>
      i === 0
        ? true
        : new Date(arr[i - 1].created_at) >= new Date(snapshot.created_at),
    ),
  );
  TestValidator.predicate(
    "page 3 sorted by created_at descending",
    page3.data.every((snapshot, i, arr) =>
      i === 0
        ? true
        : new Date(arr[i - 1].created_at) >= new Date(snapshot.created_at),
    ),
  );
}
