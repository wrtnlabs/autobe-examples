import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
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

/**
 * Test that an administrator can successfully retrieve a specific seller profile snapshot
 * by seller ID and snapshot ID. This validates the audit trail functionality where
 * administrators can access historical seller profile states for oversight and
 * dispute resolution purposes.
 *
 * Test flow:
 * 1. Administrator registers and logs in
 * 2. Seller registers and logs in
 * 3. Seller updates profile twice to create snapshot history
 * 4. Administrator retrieves snapshot history to get valid snapshot ID
 * 5. Administrator retrieves specific snapshot by ID
 * 6. Validate snapshot structure and data integrity
 */
export async function test_api_seller_profile_snapshot_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - register and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Seller updates profile first time - creates initial snapshot
  const firstUpdate = await api.functional.shoppingMall.sellers.profile.update(
    sellerConnection,
    {
      body: typia.assert<IShoppingMallSellerProfile.IUpdate>({
        shop_name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        logo_image_uri: typia.random<string & tags.Format<"uri">>(),
      }),
    },
  );
  typia.assert(firstUpdate);
  // 4. Seller updates profile second time - creates another snapshot
  const secondUpdate = await api.functional.shoppingMall.sellers.profile.update(
    sellerConnection,
    {
      body: typia.assert<IShoppingMallSellerProfile.IUpdate>({
        shop_name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      }),
    },
  );
  typia.assert(secondUpdate);
  // 5. Administrator retrieves snapshot history to get valid snapshot IDs
  const snapshotHistory =
    await api.functional.shoppingMall.administrator.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId: sellerAuth.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotHistory);
  // 6. Verify snapshot history contains records
  TestValidator.predicate(
    "snapshot history has records",
    () => snapshotHistory.data.length > 0,
  );
  // 7. Get the most recent snapshot ID from history
  const snapshotId = snapshotHistory.data[0].id;
  // 8. Administrator retrieves specific snapshot by ID
  const snapshot =
    await api.functional.shoppingMall.administrator.sellers.profile.snapshots.at(
      adminConnection,
      {
        sellerId: sellerAuth.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 9. Validate snapshot structure and data integrity
  TestValidator.equals("snapshot ID matches", snapshot.id, snapshotId);
  TestValidator.equals(
    "seller profile reference exists",
    snapshot.sellerProfile.id,
    firstUpdate.id,
  );
  TestValidator.predicate(
    "shop name is not empty",
    () => snapshot.shop_name.length > 0,
  );
  TestValidator.predicate(
    "description is not empty",
    () => snapshot.description.length > 0,
  );
  TestValidator.predicate(
    "created timestamp exists",
    () => snapshot.created_at.length > 0,
  );
}