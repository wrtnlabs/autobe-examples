import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_product_variant_snapshots_create_product_variant_snapshot } from "../../../generate/generate_random_shopping_mall_administrator_product_variant_snapshots_create_product_variant_snapshot";
import { prepare_random_shopping_mall_product_variant_snapshot } from "../../../prepare/prepare_random_shopping_mall_product_variant_snapshot";

export async function test_api_product_variant_snapshot_immutability_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the platform to authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Create a product variant snapshot
  const snapshot =
    await generate_random_shopping_mall_administrator_product_variant_snapshots_create_product_variant_snapshot(
      adminConnection,
      {
        body: undefined, // random create data
      },
    );
  typia.assert(snapshot);
  // 3. Attempt to update the snapshot and expect failure
  await TestValidator.error(
    "update product variant snapshot should fail",
    async () => {
      await adminConnection.fetch!(
        // Cast to any to bypass type error for 'id'
        `${connection.host}/shoppingMall/administrator/productVariantSnapshots/${(snapshot as any).id}`,
        {
          method: "PUT",
          headers: {
            ...adminConnection.headers!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );
    },
  );
  // 4. Attempt to delete the snapshot and expect failure
  await TestValidator.error(
    "delete product variant snapshot should fail",
    async () => {
      await adminConnection.fetch!(
        `${connection.host}/shoppingMall/administrator/productVariantSnapshots/${(snapshot as any).id}`,
        {
          method: "DELETE",
          headers: {
            ...adminConnection.headers!,
            "Content-Type": "application/json",
          },
        },
      );
    },
  );
}
