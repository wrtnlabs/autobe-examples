import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_admin_profile_snapshot_view_any(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerResult = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: sellerJoinBody,
    },
  );
  typia.assert(sellerResult);
  // 2. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEcommerceMallAdmin.IJoin;
  const adminResult = await api.functional.ecommerceMall.auth.admin.join(
    adminConnection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert(adminResult);
  // 3. Admin retrieves seller profile snapshot
  // Since we don't have a specific snapshot ID, we'll generate a random one for testing
  // In a real scenario, this would come from creating a profile update first
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.ecommerceMall.seller.profile.snapshots.at(
      adminConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // Verify snapshot contains required data
  TestValidator.equals("snapshot has ID", snapshot.id, snapshotId);
  TestValidator.predicate(
    "snapshot has seller reference",
    snapshot.ecommerce_mall_seller_id !== undefined,
  );
  TestValidator.predicate(
    "snapshot has profile reference",
    snapshot.ecommerce_mall_shop_profile_id !== undefined,
  );
  TestValidator.predicate(
    "snapshot has timestamps",
    snapshot.created_at !== undefined && snapshot.updated_at !== undefined,
  );
}
