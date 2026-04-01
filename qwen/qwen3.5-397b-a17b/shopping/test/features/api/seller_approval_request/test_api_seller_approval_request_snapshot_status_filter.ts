import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSellerApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test seller approval request snapshot status filtering functionality.
 *
 * This test validates that sellers can retrieve their approval request snapshots
 * filtered by status (pending, approved, rejected). The test:
 * 1. Registers a seller account
 * 2. Creates a seller approval request
 * 3. Registers an administrator account
 * 4. Administrator reviews the request multiple times (reject → approve) creating snapshots
 * 5. Seller retrieves snapshots filtered by different statuses
 * 6. Validates filtering by status, date range, and pagination
 */
export async function test_api_seller_approval_request_snapshot_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for later login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // 1. Register seller account
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Create seller approval request
  const approvalRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  // 3. Register administrator account
  const adminAuth = await authorize_administrator_join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  // 4. Administrator reviews request multiple times to create snapshots
  // First review: reject
  const rejectedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "rejected",
          rejection_reason: "Incomplete documentation",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals(
    "status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Second review: approve (simulating resubmission workflow)
  const approvedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "status is approved",
    approvedRequest.status,
    "approved",
  );
  // 5. Seller retrieves snapshots filtered by status
  // Test filtering by "approved" status
  const approvedSnapshots =
    await api.functional.shoppingMall.seller.approval_requests.snapshots.index(
      sellerConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
          limit: 10,
        } satisfies IShoppingMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // Validate all returned snapshots have "approved" status
  TestValidator.predicate("all snapshots are approved", () =>
    approvedSnapshots.data.every((snapshot) => snapshot.status === "approved"),
  );
  TestValidator.predicate(
    "has at least one approved snapshot",
    () => approvedSnapshots.data.length > 0,
  );
  // Test filtering by "rejected" status
  const rejectedSnapshots =
    await api.functional.shoppingMall.seller.approval_requests.snapshots.index(
      sellerConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "rejected",
          limit: 10,
        } satisfies IShoppingMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  // Validate all returned snapshots have "rejected" status
  TestValidator.predicate("all snapshots are rejected", () =>
    rejectedSnapshots.data.every((snapshot) => snapshot.status === "rejected"),
  );
  TestValidator.predicate(
    "has at least one rejected snapshot",
    () => rejectedSnapshots.data.length > 0,
  );
  // Test filtering by date range
  const now = new Date();
  const from = new Date(now.getTime() - 60000); // 1 minute ago
  const to = new Date(now.getTime() + 60000); // 1 minute from now
  const dateRangeSnapshots =
    await api.functional.shoppingMall.seller.approval_requests.snapshots.index(
      sellerConnection,
      {
        requestId: approvalRequest.id,
        body: {
          from: from.toISOString(),
          to: to.toISOString(),
          limit: 10,
        } satisfies IShoppingMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeSnapshots);
  // Validate all snapshots are within date range
  TestValidator.predicate("all snapshots within date range", () =>
    dateRangeSnapshots.data.every(
      (snapshot) =>
        new Date(snapshot.reviewed_at) >= from &&
        new Date(snapshot.reviewed_at) <= to,
    ),
  );
  // Test pagination with filter
  const paginatedSnapshots =
    await api.functional.shoppingMall.seller.approval_requests.snapshots.index(
      sellerConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
          limit: 1,
          page: 1,
        } satisfies IShoppingMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid current page",
    () => paginatedSnapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    () => paginatedSnapshots.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    () =>
      paginatedSnapshots.pagination.records >= paginatedSnapshots.data.length,
  );
}
