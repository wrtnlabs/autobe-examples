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
 * Test that requesting a non-existent seller profile snapshot returns 404.
 *
 * Validates the business rule that both the profile and the snapshot must exist
 * for successful retrieval. When an administrator requests a snapshot using a
 * valid profile ID but a randomly generated non-existent snapshot ID, the
 * system must reject the request with a 404 Not Found error.
 *
 * 1. Register a new seller via authorize_seller_join to create a seller profile
 *    and obtain a valid profileId.
 * 2. Authenticate as a platform administrator via authorize_admin_join to
 *    access the snapshot retrieval endpoint.
 * 3. Attempt to retrieve a snapshot using the valid profileId and a randomly
 *    generated non-existent snapshotId.
 * 4. Verify the system responds with a 404 error, confirming that snapshots
 *    must exist for successful retrieval.
 */
export async function test_api_seller_profile_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller to obtain a valid profileId
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Authenticate as a platform administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 3. Generate a non-existent snapshot ID
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve the non-existent snapshot and verify 404
  await TestValidator.httpError("non-existent snapshot returns 404", 404, () =>
    api.functional.shoppingMall.admin.profiles.snapshots.at(adminConnection, {
      profileId: seller.profile.id,
      snapshotId: nonExistentSnapshotId,
    }),
  );
}
