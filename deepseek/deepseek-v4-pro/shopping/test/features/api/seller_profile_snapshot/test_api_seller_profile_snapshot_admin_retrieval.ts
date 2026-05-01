import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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

/**
 * Test administrator retrieval of a seller profile snapshot by its ID.
 *
 * Validates that an authenticated platform administrator can successfully retrieve an immutable seller profile snapshot. The endpoint accepts a profile ID and snapshot ID as path parameters and returns the frozen historical data captured at the moment the snapshot was created.
 *
 * The response must include the complete snapshot data — shop_name, shop_description, logo_image (nullable URI), and created_at timestamp — along with a sellerProfile reference providing context about the parent seller profile. The snapshot data is permanently immutable and must reflect the exact state of the seller profile at the point in time when the snapshot was taken.
 *
 * 1. Administrator registers and authenticates via the join endpoint.
 * 2. Administrator retrieves a seller profile snapshot using profile and snapshot identifiers.
 * 3. Validates that the returned snapshot ID matches the requested ID and that the shop_name field contains non-empty data.
 */
export async function test_api_seller_profile_snapshot_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate profile and snapshot identifiers
  const profileId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the snapshot
  const snapshot =
    await api.functional.shoppingMall.admin.profiles.snapshots.at(
      adminConnection,
      { profileId, snapshotId },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot business data
  TestValidator.equals("snapshot id matches request", snapshot.id, snapshotId);
  TestValidator.predicate(
    "shop_name is non-empty",
    snapshot.shop_name.length > 0,
  );
}
