import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_seller_profile_snapshot_immutability_after_profile_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 3. As admin, perform first seller profile update (creates snapshot #1)
  const updatedSeller1 = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId,
      body: {
        shopName: "First Shop Name",
        shopDescription: "First Description",
        logoUrl: "https://example.com/logo1.png",
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(updatedSeller1);
  // 4. As seller, list snapshots to capture snapshot #1's ID
  // At this point only snapshot #1 exists, so we grab the first (and only) item
  const snapshotListAfterFirst =
    await api.functional.shoppingMall.seller.profileSnapshots.index(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotListAfterFirst);
  TestValidator.predicate(
    "at least one snapshot exists after first update",
    snapshotListAfterFirst.data.length >= 1,
  );
  // The list is sorted by created_at DESC; with only 1 snapshot, index 0 is snapshot #1
  const snapshot1Summary = snapshotListAfterFirst.data[0]!;
  const snapshotId1 = snapshot1Summary.id;
  // 5. As admin, perform second seller profile update (creates snapshot #2)
  const updatedSeller2 = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId,
      body: {
        shopName: "Second Shop Name",
        shopDescription: "Second Description",
        logoUrl: "https://example.com/logo2.png",
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(updatedSeller2);
  // 6. As seller, retrieve snapshot #1 using its ID
  const snapshot1Detail =
    await api.functional.shoppingMall.seller.profileSnapshots.at(
      sellerConnection,
      {
        snapshotId: snapshotId1,
      },
    );
  typia.assert(snapshot1Detail);
  // 7. Validate snapshot #1 contains historical data (NOT the updated values)
  TestValidator.equals(
    "snapshot #1 id matches",
    snapshot1Detail.id,
    snapshotId1,
  );
  TestValidator.equals(
    "snapshot #1 shopName is historical (First Shop Name)",
    snapshot1Detail.shopName,
    "First Shop Name",
  );
  TestValidator.equals(
    "snapshot #1 shopDescription is historical (First Description)",
    snapshot1Detail.shopDescription,
    "First Description",
  );
  TestValidator.equals(
    "snapshot #1 logoUrl is historical",
    snapshot1Detail.logoUrl,
    "https://example.com/logo1.png",
  );
  // 8. List snapshots again to find snapshot #2 and verify chronological ordering
  const snapshotListAfterSecond =
    await api.functional.shoppingMall.seller.profileSnapshots.index(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotListAfterSecond);
  TestValidator.predicate(
    "two snapshots exist after second update",
    snapshotListAfterSecond.data.length >= 2,
  );
  // List is DESC; snapshot #2 (most recent) is at index 0, snapshot #1 is at index 1
  const snapshot2Summary = snapshotListAfterSecond.data[0]!;
  const snapshot1SummaryAgain = snapshotListAfterSecond.data.find(
    (s) => s.id === snapshotId1,
  )!;
  TestValidator.predicate(
    "snapshot #1 createdAt predates snapshot #2 createdAt",
    new Date(snapshot1SummaryAgain.created_at) <
      new Date(snapshot2Summary.created_at),
  );
  // Confirm snapshot #2 has the updated values (shopName = 'Second Shop Name')
  TestValidator.equals(
    "snapshot #2 shopName is Second Shop Name",
    snapshot2Summary.shop_name,
    "Second Shop Name",
  );
}
