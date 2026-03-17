import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApproval";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
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

export async function test_api_seller_profile_snapshot_historical_immutability(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      shop_name: "Seller Test Shop",
    },
  });
  const sellerId = sellerAuthorized.id;
  // 3. List seller approvals to find pending approval for this seller
  const approvalsPage =
    await api.functional.shoppingMall.admin.sellerApprovals.index(
      adminConnection,
      {
        body: {
          status: "pending",
          sellerEmail: sellerEmail,
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvalsPage);
  const pendingApproval = approvalsPage.data.find(
    (a) => a.seller.email === sellerEmail,
  );
  if (pendingApproval === undefined) {
    throw new Error("Pending approval not found for the registered seller");
  }
  const approvalId = pendingApproval.id;
  // 4. Approve the seller
  const approvalResult =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approvalResult);
  // 5. Perform first profile update (Snapshot A: "Original Shop Name")
  const originalShopName = "Original Shop Name";
  const firstUpdateResult =
    await api.functional.shoppingMall.admin.sellers.update(adminConnection, {
      sellerId,
      body: {
        shopName: originalShopName,
        shopDescription: "This is the original shop description",
      } satisfies IShoppingMallSeller.IUpdate,
    });
  typia.assert(firstUpdateResult);
  // 6. List snapshots to capture Snapshot A's ID and createdAt
  const snapshotsPageA =
    await api.functional.shoppingMall.admin.sellers.profileSnapshots.index(
      adminConnection,
      {
        sellerId,
        body: {} satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPageA);
  // Find Snapshot A — the one with shopName "Original Shop Name"
  const snapshotASummary = snapshotsPageA.data.find(
    (s) => s.shop_name === originalShopName,
  );
  if (snapshotASummary === undefined) {
    throw new Error(
      "Snapshot A (Original Shop Name) not found in snapshot list",
    );
  }
  const snapshotAId = snapshotASummary.id;
  const snapshotACreatedAt = snapshotASummary.created_at;
  // 7. Perform second profile update (Snapshot B: "Updated Shop Name")
  const updatedShopName = "Updated Shop Name";
  const secondUpdateResult =
    await api.functional.shoppingMall.admin.sellers.update(adminConnection, {
      sellerId,
      body: {
        shopName: updatedShopName,
        shopDescription: "This is the updated shop description",
      } satisfies IShoppingMallSeller.IUpdate,
    });
  typia.assert(secondUpdateResult);
  // 8. List snapshots again to capture Snapshot B's createdAt
  const snapshotsPageB =
    await api.functional.shoppingMall.admin.sellers.profileSnapshots.index(
      adminConnection,
      {
        sellerId,
        body: {} satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPageB);
  const snapshotBSummary = snapshotsPageB.data.find(
    (s) => s.shop_name === updatedShopName,
  );
  if (snapshotBSummary === undefined) {
    throw new Error(
      "Snapshot B (Updated Shop Name) not found in snapshot list",
    );
  }
  const snapshotBCreatedAt = snapshotBSummary.created_at;
  // 9. Fetch Snapshot A via the target endpoint
  const snapshotA =
    await api.functional.shoppingMall.admin.sellers.profileSnapshots.at(
      adminConnection,
      {
        sellerId,
        snapshotId: snapshotAId,
      },
    );
  typia.assert(snapshotA);
  // 10. Validate snapshot immutability and correctness
  // a) Snapshot id matches requested snapshotId
  TestValidator.equals("snapshot id matches", snapshotA.id, snapshotAId);
  // b) shopName must be the original (historical) value — NOT the updated one
  TestValidator.equals(
    "snapshot shopName is historical original",
    snapshotA.shopName,
    originalShopName,
  );
  // c) Seller sub-object references the correct seller
  TestValidator.equals(
    "snapshot seller id matches",
    snapshotA.seller.id,
    sellerId,
  );
  TestValidator.equals(
    "snapshot seller email matches",
    snapshotA.seller.email,
    sellerEmail,
  );
  // d) Snapshot A createdAt is earlier than Snapshot B createdAt
  TestValidator.predicate(
    "snapshot A created before snapshot B",
    new Date(snapshotACreatedAt).getTime() <=
      new Date(snapshotBCreatedAt).getTime(),
  );
}
