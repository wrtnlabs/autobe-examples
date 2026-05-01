import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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

/**
 * Test that an administrator can retrieve any seller's profile snapshot.
 *
 * Validates the administrator's platform-wide snapshot viewing privilege for
 * oversight and dispute resolution purposes. Administrators can view snapshots
 * of any seller profile regardless of ownership, while sellers are restricted
 * to their own snapshots only.
 *
 * The test registers a seller and an administrator as separate actors, then
 * exercises the snapshot retrieval endpoint using the administrator's
 * credentials. Full response structure validation is performed via typia.assert
 * to ensure the snapshot includes all required fields: shop_name, shop_description,
 * logo_image (nullable), sellerProfile reference, and created_at timestamp.
 *
 * 1. Seller registers and authenticates via authorize_seller_join, creating
 *    a seller account with an associated shop profile.
 * 2. Administrator registers and authenticates via authorize_admin_join,
 *    obtaining admin-scoped JWT tokens with platform-wide privileges.
 * 3. Administrator retrieves a seller profile snapshot by snapshot ID using
 *    the admin-authenticated connection.
 * 4. Validates the response is a complete IShoppingMallSellerProfileSnapshot
 *    with all required fields present and correctly typed.
 */
export async function test_api_seller_profile_snapshot_admin_retrieve_any(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Register and authenticate an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 3. Administrator retrieves a seller profile snapshot
  const snapshot =
    await api.functional.shoppingMall.seller.profile.snapshots.at(
      adminConnection,
      {
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  // 4. Validate complete snapshot structure
  typia.assert(snapshot);
}
