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

export async function test_api_seller_approval_request_snapshot_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdministrator.IJoin;
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminAuth);
  // 2. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: sellerCredentials,
  });
  typia.assert(sellerAuth);
  // 3. Submit seller approval request as seller
  const approvalRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  TestValidator.equals(
    "approval request status is pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "seller id matches",
    approvalRequest.seller.id,
    sellerAuth.id,
  );
  // 4. Administrator reviews and approves the approval request
  const approvedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "approval request status is approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewed_at is set",
    approvedRequest.reviewed_at !== null &&
      approvedRequest.reviewed_at !== undefined,
  );
  TestValidator.equals(
    "reviewing administrator id matches",
    approvedRequest.reviewingAdministrator?.id,
    adminAuth.id,
  );
  // 5. Retrieve snapshot list for the approval request as administrator
  const snapshotResponse =
    await api.functional.shoppingMall.administrator.approval_requests.snapshots.index(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          limit: 20,
          page: 1,
        } satisfies IShoppingMallSellerApprovalRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    snapshotResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", snapshotResponse.pagination.limit, 20);
  TestValidator.equals(
    "records count is 1",
    snapshotResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "pages count is 1",
    snapshotResponse.pagination.pages,
    1,
  );
  // 7. Validate snapshot data
  TestValidator.predicate(
    "snapshot array has one item",
    snapshotResponse.data.length === 1,
  );
  const snapshot = snapshotResponse.data[0]!;
  TestValidator.equals(
    "snapshot status is approved",
    snapshot.status,
    "approved",
  );
  TestValidator.predicate(
    "rejection_reason is null for approved request",
    snapshot.rejection_reason === null ||
      snapshot.rejection_reason === undefined,
  );
  TestValidator.predicate("reviewed_at is set", snapshot.reviewed_at !== null);
  TestValidator.equals(
    "administrator id matches",
    snapshot.administrator?.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "administrator email matches",
    snapshot.administrator?.email,
    adminCredentials.email,
  );
  TestValidator.equals("seller id matches", snapshot.seller?.id, sellerAuth.id);
  TestValidator.equals(
    "seller email matches",
    snapshot.seller?.email,
    sellerCredentials.email,
  );
}