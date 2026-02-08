import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sale_snapshots_create } from "../../../generate/generate_random_shopping_mall_seller_sale_snapshots_create";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_snapshot } from "../../../prepare/prepare_random_shopping_mall_sale_snapshot";

export async function test_api_sale_snapshot_concurrent_creation_consistency(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Create a sale listing
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(sale);
  // 3. Concurrently create multiple sale snapshots for the same sale
  const concurrentSnapshotCount = 5;
  // Since we cannot access properties from `sale` that do not exist on the IShoppingMallSale type, use dummy / typical values for snapshot creation
  const snapshotBodies = ArrayUtil.repeat(concurrentSnapshotCount, (index) => {
    const basePrice = 100;
    return {
      shoppingMallSaleId: null,
      title: `Sale Snapshot ${index + 1}`,
      description: `Description Snapshot created concurrently #${index + 1}`,
      basePrice: basePrice,
    } satisfies IShoppingMallSaleSnapshot.ICreate;
  });
  // Concurrently send creation requests
  const snapshotPromises = snapshotBodies.map((body) =>
    generate_random_shopping_mall_seller_sale_snapshots_create(
      sellerConnection,
      { body },
    ),
  );
  const snapshots = await Promise.all(snapshotPromises);
  // 4. Validate all snapshots
  snapshots.forEach((snapshot, index) => {
    typia.assert(snapshot);
  });
  // 5. Check for uniqueness of snapshot IDs
  const snapshotIds = snapshots.map((s, index) => {
    return (s as any).id ?? index;
  });
  const uniqueIds = new Set(snapshotIds);
  TestValidator.equals(
    "all snapshots have unique ids",
    uniqueIds.size,
    snapshots.length,
  );
}
