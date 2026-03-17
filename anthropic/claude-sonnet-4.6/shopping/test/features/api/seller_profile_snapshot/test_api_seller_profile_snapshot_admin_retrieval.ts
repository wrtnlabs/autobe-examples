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

export async function test_api_seller_profile_snapshot_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Register seller account (creates seller with pending approval)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 3. List seller approvals to find the pending one for our seller
  const approvalPage =
    await api.functional.shoppingMall.admin.sellerApprovals.index(
      adminConnection,
      {
        body: {
          sellerEmail: sellerEmail,
        } satisfies IShoppingMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvalPage);
  const pendingApproval = approvalPage.data.find(
    (a) => a.seller.id === sellerId && a.status === "pending",
  );
  if (pendingApproval === undefined) {
    throw new Error(
      "Pending approval not found for the newly registered seller",
    );
  }
  // 4. Approve the seller's registration
  const approvalResult =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: pendingApproval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approvalResult);
  // 5. Update the seller's shop profile as admin (creates a new snapshot)
  const updatedShopName = RandomGenerator.name();
  const updatedShopDescription = RandomGenerator.paragraph({ sentences: 2 });
  // Use a fixed safe URI to avoid MaxLength constraint issues with typia.random
  const updatedLogoUrl: string & tags.MaxLength<80000> & tags.Format<"uri"> =
    "https://example.com/logo.png" as string &
      tags.MaxLength<80000> &
      tags.Format<"uri">;
  const updatedSeller = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId: sellerId,
      body: {
        shopName: updatedShopName,
        shopDescription: updatedShopDescription,
        logoUrl: updatedLogoUrl,
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(updatedSeller);
  // 6. List the seller's profile snapshots to get the snapshotId
  const snapshotPage =
    await api.functional.shoppingMall.admin.sellers.profileSnapshots.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {} satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  TestValidator.predicate(
    "snapshot list is not empty",
    snapshotPage.data.length > 0,
  );
  const latestSnapshot = snapshotPage.data[0];
  if (latestSnapshot === undefined) {
    throw new Error("No snapshots found after profile update");
  }
  const snapshotId = latestSnapshot.id;
  // 7. Target operation: GET /shoppingMall/admin/sellers/{sellerId}/profileSnapshots/{snapshotId}
  const snapshot =
    await api.functional.shoppingMall.admin.sellers.profileSnapshots.at(
      adminConnection,
      {
        sellerId: sellerId,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 8. Validate the snapshot contents
  TestValidator.equals(
    "snapshot id matches requested snapshotId",
    snapshot.id,
    snapshotId,
  );
  TestValidator.equals(
    "snapshot seller id matches registered seller",
    snapshot.seller.id,
    sellerId,
  );
  TestValidator.equals(
    "snapshot shopName matches updated shop name",
    snapshot.shopName,
    updatedShopName,
  );
  // 9. Confirm immutability: calling same endpoint again returns identical data
  const snapshotAgain =
    await api.functional.shoppingMall.admin.sellers.profileSnapshots.at(
      adminConnection,
      {
        sellerId: sellerId,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshotAgain);
  TestValidator.equals(
    "snapshot is immutable (same id on second call)",
    snapshot.id,
    snapshotAgain.id,
  );
  TestValidator.equals(
    "snapshot shopName immutable",
    snapshot.shopName,
    snapshotAgain.shopName,
  );
  TestValidator.equals(
    "snapshot createdAt immutable",
    snapshot.createdAt,
    snapshotAgain.createdAt,
  );
}
