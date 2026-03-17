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
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_seller_profile_snapshot_created_on_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register a seller to be updated
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  // 3. Register an admin for snapshot verification
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 4. First profile update by super admin
  const firstUpdate =
    await api.functional.shoppingMall.superAdmin.sellers.update(
      superAdminConnection,
      {
        sellerId,
        body: {
          shopName: "First Shop Name",
          shopDescription: "First description",
          logoUrl: "https://example.com/logo-v1.png",
        } satisfies IShoppingMallSeller.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  TestValidator.equals(
    "first update shopName",
    firstUpdate.shopName,
    "First Shop Name",
  );
  const firstUpdatedAt = firstUpdate.updatedAt;
  // 5. Second profile update by super admin
  const secondUpdate =
    await api.functional.shoppingMall.superAdmin.sellers.update(
      superAdminConnection,
      {
        sellerId,
        body: {
          shopName: "Second Shop Name",
          shopDescription: "Second description",
          logoUrl: "https://example.com/logo-v2.png",
        } satisfies IShoppingMallSeller.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  TestValidator.equals(
    "second update shopName",
    secondUpdate.shopName,
    "Second Shop Name",
  );
  const secondUpdatedAt = secondUpdate.updatedAt;
  // 6. Confirm updatedAt is more recent after second update
  TestValidator.predicate(
    "updatedAt is more recent after second update",
    new Date(secondUpdatedAt) >= new Date(firstUpdatedAt),
  );
  // 7. Retrieve profile snapshots as admin
  const snapshotPage =
    await api.functional.shoppingMall.admin.sellers.profileSnapshots.index(
      adminConnection,
      {
        sellerId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // 8. Assert at least 2 snapshots exist
  TestValidator.predicate(
    "at least 2 snapshots exist",
    snapshotPage.data.length >= 2,
  );
  // 9. Confirm first snapshot (with "First Shop Name") still exists (append-only)
  const firstSnapshot = snapshotPage.data.find(
    (s) => s.shop_name === "First Shop Name",
  );
  TestValidator.predicate(
    "first snapshot with First Shop Name exists",
    firstSnapshot !== undefined,
  );
  // 10. Confirm second snapshot (with "Second Shop Name") exists
  const secondSnapshot = snapshotPage.data.find(
    (s) => s.shop_name === "Second Shop Name",
  );
  TestValidator.predicate(
    "second snapshot with Second Shop Name exists",
    secondSnapshot !== undefined,
  );
  // 11. Confirm snapshot descriptions and logos
  if (firstSnapshot !== undefined) {
    TestValidator.equals(
      "first snapshot description",
      firstSnapshot.shop_description,
      "First description",
    );
    TestValidator.equals(
      "first snapshot logo",
      firstSnapshot.logo_url,
      "https://example.com/logo-v1.png",
    );
  }
  if (secondSnapshot !== undefined) {
    TestValidator.equals(
      "second snapshot description",
      secondSnapshot.shop_description,
      "Second description",
    );
    TestValidator.equals(
      "second snapshot logo",
      secondSnapshot.logo_url,
      "https://example.com/logo-v2.png",
    );
  }
  // 12. Confirm that the most recent snapshot corresponds to the second update
  // Snapshots returned default order is created_at DESC, so first element should be Second Shop Name
  const mostRecentSnapshot = snapshotPage.data.reduce((a, b) =>
    new Date(a.created_at) > new Date(b.created_at) ? a : b,
  );
  TestValidator.equals(
    "most recent snapshot is Second Shop Name",
    mostRecentSnapshot.shop_name,
    "Second Shop Name",
  );
}
