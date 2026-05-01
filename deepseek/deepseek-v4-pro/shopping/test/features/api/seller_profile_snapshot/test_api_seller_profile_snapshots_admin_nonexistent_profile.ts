import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
 * Test that requesting seller profile snapshots for a non-existent profile ID returns a 404 error.
 *
 * Validates that the admin snapshots listing endpoint correctly distinguishes between a profile that does not exist and a profile that exists but has no snapshots. The system must verify profile existence before querying the snapshots table, returning 404 for non-existent profiles rather than silently returning an empty result set.
 *
 * 1. Administrator registers an account via the join endpoint.
 * 2. A random UUID is generated to serve as a non-existent seller profile ID.
 * 3. The administrator requests snapshot history for the non-existent profile.
 * 4. The API correctly returns a 404 Not Found response, confirming profile existence validation.
 */
export async function test_api_seller_profile_snapshots_admin_nonexistent_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Generate non-existent seller profile ID
  const nonexistentProfileId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to fetch snapshots for non-existent profile — expect 404
  await TestValidator.httpError(
    "non-existent seller profile should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.profiles.snapshots.index(
        adminConnection,
        {
          profileId: nonexistentProfileId,
          body: typia.random<IShoppingMallSellerProfileSnapshot.IRequest>(),
        },
      );
    },
  );
}
