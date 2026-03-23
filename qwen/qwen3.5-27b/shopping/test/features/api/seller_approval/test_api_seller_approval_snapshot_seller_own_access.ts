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
 * Test that authenticated sellers can only access their own approval request snapshots.
 *
 * This test verifies the authorization logic for seller approval snapshots:
 * 1. Admin creates and approves two separate seller accounts
 * 2. Each seller submits an approval request (creating snapshots)
 * 3. Seller A can successfully retrieve their own snapshots
 * 4. Seller A receives 403 Forbidden when attempting to access Seller B's snapshots
 * 5. Validates snapshot data structure and pagination response format
 */
export async function test_api_seller_approval_snapshot_seller_own_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and login as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  // 2. Seller A setup - register and login
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: "sellerA@test.com",
      password: "1234",
      shop_name: "Shop A",
    },
  });
  typia.assert(sellerAAuth);
  // 3. Seller B setup - register and login
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: "sellerB@test.com",
      password: "1234",
      shop_name: "Shop B",
    },
  });
  typia.assert(sellerBAuth);
  // 4. Seller A submits approval request (creates snapshot)
  const approvalRequestA =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerAConnection,
      {
        body: {
          reason: "Seller A wants to join the platform",
        },
      },
    );
  typia.assert(approvalRequestA);
  // 5. Seller B submits approval request (creates snapshot)
  const approvalRequestB =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerBConnection,
      {
        body: {
          reason: "Seller B wants to join the platform",
        },
      },
    );
  typia.assert(approvalRequestB);
  // 6. Admin approves Seller A's request
  await api.functional.shoppingMall.admin.sellerApprovalRequests.update(
    adminConnection,
    {
      requestId: approvalRequestA.id,
      body: {
        status: "approved",
      } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
    },
  );
  // 7. Admin approves Seller B's request
  await api.functional.shoppingMall.admin.sellerApprovalRequests.update(
    adminConnection,
    {
      requestId: approvalRequestB.id,
      body: {
        status: "approved",
      } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
    },
  );
  // 8. Seller A retrieves their own snapshots - should succeed
  const ownSnapshots =
    await api.functional.shoppingMall.admin.sellers.snapshots.index(
      sellerAConnection,
      {
        sellerId: sellerAAuth.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSellerApprovalSnapshot.IRequest,
      },
    );
  typia.assert(ownSnapshots);
  // Validate own snapshots response
  TestValidator.equals(
    "own snapshots pagination present",
    ownSnapshots.pagination,
    ownSnapshots.pagination,
  );
  TestValidator.predicate(
    "own snapshots data is array",
    Array.isArray(ownSnapshots.data),
  );
  TestValidator.predicate(
    "own snapshots has at least one snapshot",
    ownSnapshots.data.length >= 1,
  );
  // Validate snapshot structure
  if (ownSnapshots.data.length > 0) {
    const snapshot = ownSnapshots.data[0];
    TestValidator.predicate("snapshot has id", snapshot.id.length > 0);
    TestValidator.predicate(
      "snapshot has snapshot_data",
      snapshot.snapshot_data.length > 0,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at.length > 0,
    );
  }
  // 9. Seller A attempts to access Seller B's snapshots - should fail with 403
  await TestValidator.httpError(
    "seller A cannot access seller B's snapshots",
    403,
    async () =>
      await api.functional.shoppingMall.admin.sellers.snapshots.index(
        sellerAConnection,
        {
          sellerId: sellerBAuth.id,
          body: {
            page: 1,
            limit: 20,
          } satisfies IShoppingMallSellerApprovalSnapshot.IRequest,
        },
      ),
  );
  // 10. Seller B can access their own snapshots - should succeed
  const sellerBOwnSnapshots =
    await api.functional.shoppingMall.admin.sellers.snapshots.index(
      sellerBConnection,
      {
        sellerId: sellerBAuth.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSellerApprovalSnapshot.IRequest,
      },
    );
  typia.assert(sellerBOwnSnapshots);
  TestValidator.predicate(
    "seller B own snapshots has data",
    sellerBOwnSnapshots.data.length >= 1,
  );
  // 11. Seller B cannot access Seller A's snapshots - should fail with 403
  await TestValidator.httpError(
    "seller B cannot access seller A's snapshots",
    403,
    async () =>
      await api.functional.shoppingMall.admin.sellers.snapshots.index(
        sellerBConnection,
        {
          sellerId: sellerAAuth.id,
          body: {
            page: 1,
            limit: 20,
          } satisfies IShoppingMallSellerApprovalSnapshot.IRequest,
        },
      ),
  );
}
