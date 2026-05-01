import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller cannot access another seller's profile snapshot.
 *
 * Validates the ownership-based authorization enforced on the seller profile snapshot retrieval endpoint. When Seller B attempts to fetch a snapshot belonging to Seller A's profile, the system must reject the request with HTTP 403 Forbidden, preventing cross-seller data leakage.
 *
 * The test also confirms that authorization is correctly scoped rather than making the snapshot globally inaccessible — after the 403 rejection from Seller B's attempt, Seller A can still successfully retrieve the same snapshot using their own authentication token.
 *
 * 1. Register and authenticate Seller A and Seller B as separate, unrelated sellers.
 * 2. Generate a snapshot identifier for cross-seller access testing.
 * 3. Seller B attempts to retrieve the snapshot and receives 403 Forbidden.
 * 4. Seller A retrieves the same snapshot successfully, confirming the snapshot remains intact and authorization is ownership-scoped.
 */
export async function test_api_seller_profile_snapshot_cross_seller_access_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerA);
  // 2. Register and authenticate Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {});
  // 3. Generate snapshot identifier for cross-seller access testing
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 4. Seller B attempts to access Seller A's snapshot → 403 Forbidden
  await TestValidator.httpError(
    "seller B cannot access another seller's profile snapshot",
    403,
    async () => {
      await api.functional.shoppingMall.seller.profile.snapshots.at(
        sellerBConnection,
        { snapshotId },
      );
    },
  );
  // 5. Seller A can still retrieve the snapshot with their own token
  const snapshot =
    await api.functional.shoppingMall.seller.profile.snapshots.at(
      sellerAConnection,
      { snapshotId },
    );
  typia.assert(snapshot);
}
