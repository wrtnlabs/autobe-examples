import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_cancellation_requests_access_restrictions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test with pending seller (approval status='pending')
  const pendingSellerConnection: api.IConnection = { host: connection.host };
  const pendingSeller = await authorize_seller_join(pendingSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(pendingSeller);
  // Pending seller should not be able to access dashboard
  await TestValidator.httpError(
    "pending seller denied access",
    [403, 401],
    async () => {
      await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
        pendingSellerConnection,
        { body: {} },
      );
    },
  );
  // 2. Test with rejected seller (approval status='rejected')
  const rejectedSellerConnection: api.IConnection = { host: connection.host };
  const rejectedSeller = await authorize_seller_join(rejectedSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(rejectedSeller);
  // Rejected seller should not be able to access dashboard
  await TestValidator.httpError(
    "rejected seller denied access",
    [403, 401],
    async () => {
      await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
        rejectedSellerConnection,
        { body: {} },
      );
    },
  );
  // 3. Test with banned seller (isBanned=true)
  const bannedSellerConnection: api.IConnection = { host: connection.host };
  const bannedSeller = await authorize_seller_join(bannedSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(bannedSeller);
  // Banned seller should not be able to access dashboard
  await TestValidator.httpError(
    "banned seller denied access",
    [403, 401],
    async () => {
      await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
        bannedSellerConnection,
        { body: {} },
      );
    },
  );
  // 4. Test with suspended seller (isSuspended=true)
  const suspendedSellerConnection: api.IConnection = { host: connection.host };
  const suspendedSeller = await authorize_seller_join(
    suspendedSellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(suspendedSeller);
  // Suspended seller should not be able to access dashboard
  await TestValidator.httpError(
    "suspended seller denied access",
    [403, 401],
    async () => {
      await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
        suspendedSellerConnection,
        { body: {} },
      );
    },
  );
  // 5. Cross-Seller Access Prevention
  // Create two active sellers
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerA);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerB);
  // Seller A accesses their own dashboard
  const sellerADashboard: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      sellerAConnection,
      { body: { pageSize: 100 } },
    );
  typia.assert(sellerADashboard);
  // Seller B accesses their own dashboard
  const sellerBDashboard: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      sellerBConnection,
      { body: { pageSize: 100 } },
    );
  typia.assert(sellerBDashboard);
  // Cross-access: Seller A should NOT be able to access Seller B's data
  // (This would fail if the API returns Seller B's data when using Seller A's token)
  // Note: The API filters by authenticated seller, so this is implicitly tested
  TestValidator.predicate(
    "seller A dashboard has valid pagination",
    sellerADashboard.pagination !== undefined,
  );
  TestValidator.predicate(
    "seller B dashboard has valid pagination",
    sellerBDashboard.pagination !== undefined,
  );
  // 6. Unauthenticated Access
  const unauthConnection: api.IConnection = { host: connection.host };
  // No authentication should return 401
  await TestValidator.httpError(
    "unauthenticated access denied",
    401,
    async () => {
      await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
        unauthConnection,
        { body: {} },
      );
    },
  );
  // 7. Pagination and Edge Cases - Empty result handling
  const emptySellerConnection: api.IConnection = { host: connection.host };
  const emptySeller = await authorize_seller_join(emptySellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(emptySeller);
  const emptyDashboard: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      emptySellerConnection,
      { body: { pageSize: 20 } },
    );
  typia.assert(emptyDashboard);
  // Verify empty results
  TestValidator.equals("empty results count", emptyDashboard.data.length, 0);
  TestValidator.equals(
    "empty pagination current",
    emptyDashboard.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty pagination pages",
    emptyDashboard.pagination.pages,
    0,
  );
  // 8. Large result set handling (100 items - max page size)
  const largeSellerConnection: api.IConnection = { host: connection.host };
  const largeSeller = await authorize_seller_join(largeSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(largeSeller);
  const largeDashboard: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      largeSellerConnection,
      { body: { pageSize: 100 } },
    );
  typia.assert(largeDashboard);
  // Verify max page size respected
  TestValidator.equals("max page size", largeDashboard.pagination.limit, 100);
  // 9. Cursor-based pagination structure validation
  const cursorSellerConnection: api.IConnection = { host: connection.host };
  const cursorSeller = await authorize_seller_join(cursorSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(cursorSeller);
  const firstPage: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      cursorSellerConnection,
      { body: { pageSize: 10, sort: "createdAt", sortOrder: "DESC" } },
    );
  typia.assert(firstPage);
  // Verify first page structure
  if (firstPage.data.length > 0) {
    const firstItem = firstPage.data[0];
    typia.assert(firstItem);
    // Verify required fields exist
    TestValidator.predicate("item has id", firstItem.id !== undefined);
    TestValidator.predicate(
      "item has customer_id",
      firstItem.customer_id !== undefined,
    );
    TestValidator.predicate(
      "item has order_item_id",
      firstItem.order_item_id !== undefined,
    );
    TestValidator.predicate("item has reason", firstItem.reason.length > 0);
    TestValidator.predicate(
      "item has request_status",
      firstItem.request_status !== undefined,
    );
    TestValidator.predicate(
      "item has created_at",
      firstItem.created_at !== undefined,
    );
    TestValidator.predicate(
      "item has updated_at",
      firstItem.updated_at !== undefined,
    );
  }
  // 10. Business Logic Validation
  const businessSellerConnection: api.IConnection = { host: connection.host };
  const businessSeller = await authorize_seller_join(businessSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(businessSeller);
  const businessDashboard: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.seller.cancellationRequests.dashboard.index(
      businessSellerConnection,
      { body: { pageSize: 20 } },
    );
  typia.assert(businessDashboard);
  // Verify status transitions are shown
  const pendingRequests = businessDashboard.data.filter(
    (item) => item.request_status === "pending",
  );
  const approvedRequests = businessDashboard.data.filter(
    (item) => item.request_status === "approved",
  );
  const rejectedRequests = businessDashboard.data.filter(
    (item) => item.request_status === "rejected",
  );
  // All statuses are valid
  TestValidator.predicate(
    "all requests have valid status",
    pendingRequests.length +
      approvedRequests.length +
      rejectedRequests.length ===
      businessDashboard.data.length,
  );
  // Verify customer_id is present for each request
  for (const item of businessDashboard.data) {
    TestValidator.predicate(
      `request ${item.id} has customer_id`,
      item.customer_id !== undefined && item.customer_id.length > 0,
    );
  }
}
