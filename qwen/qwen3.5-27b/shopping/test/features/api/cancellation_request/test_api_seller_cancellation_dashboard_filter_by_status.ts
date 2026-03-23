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

export async function test_api_seller_cancellation_dashboard_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a seller can filter cancellation requests by status (pending, approved, rejected) on the dashboard.
   * This test validates the filtering functionality of the seller cancellation requests dashboard endpoint.
   */
  // 1. Setup: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin/join",
    },
  });
  typia.assert(adminJoin);
  // 2. Setup: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      shop_name: "Test Shop",
      shop_description: "Test shop for cancellation filtering",
      href: "https://test.com/seller/join",
      referrer: "https://test.com/seller/join",
    },
  });
  typia.assert(sellerJoin);
  // 3. Setup: Seller login
  // Note: In a real scenario, the seller would need to be approved by admin first.
  // This test assumes the test environment has pre-approved sellers or the seller
  // was approved through external test data seeding as mentioned in the scenario.
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      href: "https://test.com/seller/login",
      referrer: "https://test.com/seller/login",
    },
  });
  // 4. Test Case 1: Filter by 'pending' status
  const pendingResponse =
    await api.functional.shoppingMall.seller.cancellation_requests.dashboard.index(
      sellerLoginConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // Validate pending filter results
  TestValidator.predicate(
    "pending filter returns correct pagination",
    pendingResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pending filter returns only pending requests",
    pendingResponse.data.every((req) => req.status === "pending"),
  );
  TestValidator.predicate(
    "pending requests have null respondedAt",
    pendingResponse.data.every((req) => req.respondedAt === null),
  );
  TestValidator.predicate(
    "pending requests have null rejectionReason",
    pendingResponse.data.every((req) => req.rejectionReason === null),
  );
  // 5. Test Case 2: Filter by 'approved' status
  const approvedResponse =
    await api.functional.shoppingMall.seller.cancellation_requests.dashboard.index(
      sellerLoginConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedResponse);
  // Validate approved filter results
  TestValidator.predicate(
    "approved filter returns correct pagination",
    approvedResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "approved filter returns only approved requests",
    approvedResponse.data.every((req) => req.status === "approved"),
  );
  TestValidator.predicate(
    "approved requests have respondedAt populated",
    approvedResponse.data.every((req) => req.respondedAt !== null),
  );
  TestValidator.predicate(
    "approved requests have seller information",
    approvedResponse.data.every((req) => req.seller !== null),
  );
  // 6. Test Case 3: Filter by 'rejected' status
  const rejectedResponse =
    await api.functional.shoppingMall.seller.cancellation_requests.dashboard.index(
      sellerLoginConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedResponse);
  // Validate rejected filter results
  TestValidator.predicate(
    "rejected filter returns correct pagination",
    rejectedResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "rejected filter returns only rejected requests",
    rejectedResponse.data.every((req) => req.status === "rejected"),
  );
  TestValidator.predicate(
    "rejected requests have respondedAt populated",
    rejectedResponse.data.every((req) => req.respondedAt !== null),
  );
  TestValidator.predicate(
    "rejected requests have rejectionReason populated",
    rejectedResponse.data.every((req) => req.rejectionReason !== null),
  );
  // 7. Test Case 4: No filter (all statuses)
  const allResponse =
    await api.functional.shoppingMall.seller.cancellation_requests.dashboard.index(
      sellerLoginConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(allResponse);
  // Validate no filter returns all statuses
  TestValidator.predicate(
    "no filter returns correct pagination",
    allResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "no filter includes all status types",
    allResponse.data.every((req) =>
      ["pending", "approved", "rejected"].includes(req.status),
    ),
  );
  // 8. Validate pagination consistency
  TestValidator.equals(
    "total records equals sum of filtered counts",
    allResponse.pagination.records,
    pendingResponse.pagination.records +
      approvedResponse.pagination.records +
      rejectedResponse.pagination.records,
  );
}
