import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test admin access to seller approval snapshots.
 * Validates that administrators can retrieve immutable audit snapshots of seller approval requests,
 * including pagination, filtering, and snapshot data integrity.
 */
export async function test_api_seller_approval_snapshot_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 3. Seller submits approval request (creates first snapshot)
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(approvalRequest);
  // 4. Admin approves the seller request (creates second snapshot)
  const updatedRequest =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Admin retrieves snapshots for the seller
  const snapshotsResponse =
    await api.functional.shoppingMall.admin.sellers.snapshots.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          page: 1,
          limit: 20,
          sort_order: "desc",
        } satisfies IShoppingMallSellerApprovalSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", snapshotsResponse.pagination.limit, 20);
  TestValidator.predicate(
    "total records is at least 2",
    snapshotsResponse.pagination.records >= 2,
  );
  TestValidator.predicate(
    "total pages is at least 1",
    snapshotsResponse.pagination.pages >= 1,
  );
  // 7. Validate snapshots data
  TestValidator.predicate(
    "snapshots array has at least 2 items",
    snapshotsResponse.data.length >= 2,
  );
  // 8. Validate each snapshot structure
  for (const snapshot of snapshotsResponse.data) {
    TestValidator.predicate(
      `snapshot has valid UUID: ${snapshot.id}`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    TestValidator.predicate(
      `snapshot has valid date-time: ${snapshot.created_at}`,
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T| )([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
        snapshot.created_at,
      ),
    );
    // Validate snapshot_data is valid JSON
    let parsedData: any;
    try {
      parsedData = JSON.parse(snapshot.snapshot_data);
    } catch (exp) {
      throw new Error(
        `snapshot_data is not valid JSON: ${snapshot.snapshot_data}`,
      );
    }
    TestValidator.predicate(
      `snapshot_data contains seller_id: ${snapshot.id}`,
      parsedData.seller_id !== undefined,
    );
    TestValidator.predicate(
      `snapshot_data contains reason: ${snapshot.id}`,
      parsedData.reason !== undefined,
    );
    TestValidator.predicate(
      `snapshot_data contains status: ${snapshot.id}`,
      parsedData.status !== undefined,
    );
    TestValidator.predicate(
      `snapshot_data contains submitted_at: ${snapshot.id}`,
      parsedData.submitted_at !== undefined,
    );
  }
  // 9. Validate snapshots are ordered by created_at descending
  if (snapshotsResponse.data.length >= 2) {
    const firstSnapshot = snapshotsResponse.data[0];
    const secondSnapshot = snapshotsResponse.data[1];
    TestValidator.predicate(
      "first snapshot is newer than second snapshot",
      new Date(firstSnapshot.created_at).getTime() >=
        new Date(secondSnapshot.created_at).getTime(),
    );
  }
}
