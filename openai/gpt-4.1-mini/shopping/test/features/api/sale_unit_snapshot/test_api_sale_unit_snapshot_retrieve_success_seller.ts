import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import type { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import type { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_sale_unit_snapshot_retrieve_success_seller(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Seller successfully retrieves a sale unit snapshot by valid IDs
  // 1. Seller join and authorize
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass123!",
      shopName: "Test Shop",
      shopDescription: "Test Shop Description",
      logoUri: null,
    },
  });
  // Update seller connection headers for authenticated session
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: sellerAuthorized.token.access,
  };
  // 2. Prepare valid UUIDs for saleId, unitId, snapshotId
  const saleId = typia.random<string & tags.Format<"uuid">>();
  const unitId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the sale unit snapshot using authorized seller connection
  const snapshot =
    await api.functional.shoppingMall.seller.sales.units.snapshots.at(
      sellerConnection,
      {
        saleId,
        unitId,
        snapshotId,
      },
    );
  // 4. Assert the response is valid and matches the snapshot ID
  typia.assert(snapshot);
  // 5. Validate snapshot fields for accuracy
  TestValidator.equals(
    "sale unit snapshot id matches",
    snapshot.id,
    snapshotId,
  );
  TestValidator.equals(
    "sale unit snapshot sale unit id matches",
    snapshot.shoppingMallSaleUnitId,
    unitId,
  );
  TestValidator.equals(
    "sale unit snapshot sale snapshot id matches",
    snapshot.shoppingMallSaleSnapshotId,
    saleId,
  );
  TestValidator.predicate("sku code is non-empty", snapshot.skuCode.length > 0);
  TestValidator.predicate(
    "option values is non-empty",
    snapshot.optionValues.length > 0,
  );
  // priceOverride can be null or number
  TestValidator.predicate(
    "price override is number or null",
    snapshot.priceOverride === null ||
      typeof snapshot.priceOverride === "number",
  );
  TestValidator.predicate(
    "stock quantity is non-negative integer",
    snapshot.stockQuantity >= 0,
  );
  TestValidator.predicate(
    "is active is boolean",
    typeof snapshot.isActive === "boolean",
  );
}
