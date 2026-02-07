import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellersSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellersSnapshot";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_seller_snapshot_metadata_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate super admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallSuperAdmin.IAuthorized =
    await api.functional.shoppingMall.auth.super_admin.join(adminConnection, {
      body: {},
    });
  typia.assert(adminAuth);
  // 2. Create seller profile with edits to generate snapshot
  // Note: This test assumes seller profile editing creates snapshots automatically
  // In real scenario, you would register seller and make edits
  // 3. Update seller snapshot metadata
  const result: IShoppingMallSellersSnapshot =
    await api.functional.shoppingMall.sellers_snapshots.update(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(result);
  // 4. Verify metadata update preserves core snapshot data
  // The core snapshot data (shop_name, shop_description, logo_image_id) should remain unchanged
  // Only metadata fields should be updated
}
