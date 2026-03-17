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

export async function test_api_seller_profile_snapshots_admin_list_after_profile_edits(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Register admin ───────────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // ─── 2. Register seller ──────────────────────────────────────────────────
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  // ─── 3. Trigger snapshots via two profile updates (as admin) ─────────────
  const firstUpdate = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId,
      body: {
        shopName: `Shop Alpha ${RandomGenerator.alphabets(6)}`,
        shopDescription: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  const secondUpdate = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId,
      body: {
        shopName: `Shop Beta ${RandomGenerator.alphabets(6)}`,
        shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  // ─── 4. List snapshots with default pagination ───────────────────────────
  const snapshotPage =
    await api.functional.shoppingMall.admin.sellers.profileSnapshots.index(
      adminConnection,
      {
        sellerId,
        body: {} satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // ─── 5. Validate pagination metadata ─────────────────────────────────────
  TestValidator.predicate(
    "pagination.current >= 1",
    snapshotPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit >= 1",
    snapshotPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination.records >= 2",
    snapshotPage.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination.pages >= 1",
    snapshotPage.pagination.pages >= 1,
  );
  // ─── 6. Validate data array has at least 2 entries ───────────────────────
  TestValidator.predicate(
    "data array has at least 2 snapshots",
    snapshotPage.data.length >= 2,
  );
  // ─── 7. Validate each snapshot's seller identity and shop_name ───────────
  for (const snapshot of snapshotPage.data) {
    TestValidator.equals(
      "snapshot seller id matches target seller",
      snapshot.seller.id,
      sellerId,
    );
    TestValidator.predicate(
      "snapshot shop_name is non-empty",
      snapshot.shop_name.length > 0,
    );
  }
  // ─── 8. Verify snapshots are ordered by created_at DESC ──────────────────
  for (let i = 0; i < snapshotPage.data.length - 1; i++) {
    const current = snapshotPage.data[i]!;
    const next = snapshotPage.data[i + 1]!;
    TestValidator.predicate(
      "snapshots ordered by created_at DESC",
      current.created_at >= next.created_at,
    );
  }
  // ─── 9. Explicit pagination test: page=1, limit=5 ────────────────────────
  const pagedResult =
    await api.functional.shoppingMall.admin.sellers.profileSnapshots.index(
      adminConnection,
      {
        sellerId,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(pagedResult);
  TestValidator.equals(
    "paged result current page is 1",
    pagedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "paged result limit is 5",
    pagedResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "paged result records >= 2",
    pagedResult.pagination.records >= 2,
  );
  TestValidator.equals(
    "total records match across both calls",
    pagedResult.pagination.records,
    snapshotPage.pagination.records,
  );
}
