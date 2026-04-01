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

export async function test_api_seller_approval_request_snapshot_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate administrator
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
  // 2. Register and authenticate seller
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
  // 3. Submit seller approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_approval_requests_create(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  TestValidator.equals("initial status", approvalRequest.status, "pending");
  // 4. Administrator rejects the approval request (creates first snapshot)
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals("rejection status", rejectedRequest.status, "rejected");
  TestValidator.equals(
    "rejection reason",
    rejectedRequest.rejection_reason,
    rejectionReason,
  );
  // 5. Administrator approves the request (creates second snapshot)
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
  TestValidator.equals("approval status", approvedRequest.status, "approved");
  // 6. Retrieve snapshot list as administrator
  const snapshotResponse =
    await api.functional.shoppingMall.administrator.approval_requests.snapshots.index(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          limit: 10,
          page: 1,
        } satisfies IShoppingMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 7. Verify pagination info
  TestValidator.equals("current page", snapshotResponse.pagination.current, 1);
  TestValidator.predicate(
    "limit is set",
    snapshotResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "has snapshots",
    snapshotResponse.pagination.records >= 1,
  );
  // 8. Verify snapshot content - business logic validations
  const rejectedSnapshots = snapshotResponse.data.filter(
    (s) => s.status === "rejected",
  );
  const approvedSnapshots = snapshotResponse.data.filter(
    (s) => s.status === "approved",
  );
  TestValidator.predicate(
    "has rejected snapshot",
    rejectedSnapshots.length >= 1,
  );
  TestValidator.predicate(
    "has approved snapshot",
    approvedSnapshots.length >= 1,
  );
  // Verify rejected snapshots have rejection reasons
  for (const snapshot of rejectedSnapshots) {
    TestValidator.predicate(
      "rejected snapshot has reason",
      snapshot.rejection_reason !== null &&
        snapshot.rejection_reason !== undefined,
    );
    TestValidator.predicate(
      "rejected snapshot has administrator",
      snapshot.administrator !== null,
    );
  }
  // Verify approved snapshots have administrator info
  for (const snapshot of approvedSnapshots) {
    TestValidator.predicate(
      "approved snapshot has administrator",
      snapshot.administrator !== null,
    );
  }
  // Verify all snapshots have seller info
  for (const snapshot of snapshotResponse.data) {
    TestValidator.predicate("snapshot has seller", snapshot.seller !== null);
    TestValidator.predicate(
      "snapshot has review timestamp",
      snapshot.reviewed_at !== null && snapshot.reviewed_at !== undefined,
    );
  }
}
