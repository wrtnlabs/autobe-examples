import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_view_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData = typia.random<IEcommerceMallSeller.IJoin>();
  const seller = await authorize_seller_join(sellerConnection, {
    body: sellerData,
  });
  typia.assert(seller);
  // 2. List seller's profile snapshots to get available snapshot IDs
  const snapshotList =
    await api.functional.ecommerceMall.seller.profile.snapshots.at(
      sellerConnection,
      { snapshotId: "dummy-id" },
    );
  typia.assert(snapshotList);
  // 3. Verify snapshot belongs to current seller
  TestValidator.equals(
    "snapshot seller matches current seller",
    snapshotList.ecommerce_mall_seller_id,
    seller.id,
  );
  // 4. Validate snapshot contains required historical data
  TestValidator.predicate("snapshot has timestamp", !!snapshotList.created_at);
  TestValidator.predicate(
    "snapshot has seller reference",
    snapshotList.ecommerce_mall_seller_id !== undefined,
  );
  TestValidator.predicate(
    "snapshot has profile reference",
    snapshotList.ecommerce_mall_shop_profile_id !== undefined,
  );
}
