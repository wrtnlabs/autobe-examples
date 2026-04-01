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
 * Test filtering seller approval request snapshots by approval status.
 *
 * This test verifies the snapshot filtering functionality for seller approval requests:
 * 1. Administrator registers and authenticates
 * 2. Seller registers and submits approval request
 * 3. Administrator rejects the first request (creates rejected snapshot)
 * 4. Seller resubmits approval request after rejection
 * 5. Administrator approves the resubmitted request (creates approved snapshot)
 * 6. Filter snapshots by status='approved' on approved request - should return 1 snapshot
 * 7. Filter snapshots by status='rejected' on approved request - should return 0 snapshots
 * 8. Filter snapshots by status='rejected' on rejected request - should return 1 snapshot
 * 9. Validate pagination metadata reflects filtered counts correctly
 */
export async function test_api_seller_approval_request_snapshot_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Seller submits initial approval request
  const initialRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(initialRequest);
  TestValidator.equals("initial status", initialRequest.status, "pending");
  // 4. Administrator rejects the first request
  const rejectedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: initialRequest.id,
        body: {
          status: "rejected",
          rejection_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals("rejected status", rejectedRequest.status, "rejected");
  TestValidator.predicate(
    "has rejection reason",
    rejectedRequest.rejection_reason !== null &&
      rejectedRequest.rejection_reason !== undefined,
  );
  // 5. Seller resubmits approval request after rejection
  const resubmittedRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(resubmittedRequest);
  TestValidator.equals(
    "resubmitted status",
    resubmittedRequest.status,
    "pending",
  );
  TestValidator.notEquals(
    "different request IDs",
    initialRequest.id,
    resubmittedRequest.id,
  );
  // 6. Administrator approves the resubmitted request
  const approvedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: resubmittedRequest.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals("approved status", approvedRequest.status, "approved");
  // 7. Retrieve snapshots from approved request filtered by status='approved'
  const approvedSnapshots =
    await api.functional.shoppingMall.administrator.approval_requests.snapshots.index(
      adminConnection,
      {
        requestId: approvedRequest.id,
        body: {
          status: "approved",
          limit: 20,
        } satisfies IShoppingMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // Validate approved filter results on approved request
  TestValidator.equals(
    "approved count",
    approvedSnapshots.pagination.records,
    1,
  );
  TestValidator.equals(
    "approved data length",
    approvedSnapshots.data.length,
    1,
  );
  TestValidator.equals(
    "approved snapshot status",
    approvedSnapshots.data[0]!.status,
    "approved",
  );
  TestValidator.predicate(
    "approved has administrator",
    approvedSnapshots.data[0]!.administrator !== null,
  );
  // 8. Retrieve snapshots from approved request filtered by status='rejected' (should be 0)
  const rejectedFromApprovedSnapshots =
    await api.functional.shoppingMall.administrator.approval_requests.snapshots.index(
      adminConnection,
      {
        requestId: approvedRequest.id,
        body: {
          status: "rejected",
          limit: 20,
        } satisfies IShoppingMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedFromApprovedSnapshots);
  // Validate no rejected snapshots on approved request
  TestValidator.equals(
    "rejected from approved count",
    rejectedFromApprovedSnapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "rejected from approved data length",
    rejectedFromApprovedSnapshots.data.length,
    0,
  );
  // 9. Retrieve snapshots from rejected request filtered by status='rejected'
  const rejectedSnapshots =
    await api.functional.shoppingMall.administrator.approval_requests.snapshots.index(
      adminConnection,
      {
        requestId: rejectedRequest.id,
        body: {
          status: "rejected",
          limit: 20,
        } satisfies IShoppingMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  // Validate rejected filter results on rejected request
  TestValidator.equals(
    "rejected count",
    rejectedSnapshots.pagination.records,
    1,
  );
  TestValidator.equals(
    "rejected data length",
    rejectedSnapshots.data.length,
    1,
  );
  TestValidator.equals(
    "rejected snapshot status",
    rejectedSnapshots.data[0]!.status,
    "rejected",
  );
  TestValidator.predicate(
    "rejected has rejection reason",
    rejectedSnapshots.data[0]!.rejection_reason !== null &&
      rejectedSnapshots.data[0]!.rejection_reason !== undefined,
  );
  // 10. Retrieve snapshots from rejected request filtered by status='approved' (should be 0)
  const approvedFromRejectedSnapshots =
    await api.functional.shoppingMall.administrator.approval_requests.snapshots.index(
      adminConnection,
      {
        requestId: rejectedRequest.id,
        body: {
          status: "approved",
          limit: 20,
        } satisfies IShoppingMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedFromRejectedSnapshots);
  // Validate no approved snapshots on rejected request
  TestValidator.equals(
    "approved from rejected count",
    approvedFromRejectedSnapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "approved from rejected data length",
    approvedFromRejectedSnapshots.data.length,
    0,
  );
  // 11. Retrieve all snapshots from approved request without filter
  const allApprovedSnapshots =
    await api.functional.shoppingMall.administrator.approval_requests.snapshots.index(
      adminConnection,
      {
        requestId: approvedRequest.id,
        body: {
          limit: 20,
        } satisfies IShoppingMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(allApprovedSnapshots);
  // Validate unfiltered results for approved request
  TestValidator.equals(
    "approved total count",
    allApprovedSnapshots.pagination.records,
    1,
  );
  TestValidator.equals(
    "approved total data length",
    allApprovedSnapshots.data.length,
    1,
  );
  // 12. Retrieve all snapshots from rejected request without filter
  const allRejectedSnapshots =
    await api.functional.shoppingMall.administrator.approval_requests.snapshots.index(
      adminConnection,
      {
        requestId: rejectedRequest.id,
        body: {
          limit: 20,
        } satisfies IShoppingMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(allRejectedSnapshots);
  // Validate unfiltered results for rejected request
  TestValidator.equals(
    "rejected total count",
    allRejectedSnapshots.pagination.records,
    1,
  );
  TestValidator.equals(
    "rejected total data length",
    allRejectedSnapshots.data.length,
    1,
  );
  // 13. Verify pagination metadata consistency
  TestValidator.equals("approved pages", approvedSnapshots.pagination.pages, 1);
  TestValidator.equals("rejected pages", rejectedSnapshots.pagination.pages, 1);
  TestValidator.equals(
    "approved current page",
    approvedSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "rejected current page",
    rejectedSnapshots.pagination.current,
    1,
  );
}
