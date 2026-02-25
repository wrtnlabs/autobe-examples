import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_inventory_histories_create_inventory_history } from "../../../generate/generate_random_shopping_mall_seller_inventory_histories_create_inventory_history";
import { prepare_random_shopping_mall_inventory_history } from "../../../prepare/prepare_random_shopping_mall_inventory_history";

export async function test_api_seller_inventory_history_create_add_stock(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test creating an inventory history record with positive quantity delta
  // 1. Seller joins and is authenticated
  // 2. Create an inventory history record with positive quantity delta (stock addition)
  // 3. Validate created record structure and data
  // 1. Seller registration and obtaining authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = authorized.token.access;
  // 2. Generate random inventory history for stock addition with positive quantity delta
  const quantityDelta = typia.random<
    number & tags.Type<"int32">
  >() satisfies number as number;
  // Force positive quantity delta at least 1
  const positiveQuantityDelta = Math.max(1, Math.abs(quantityDelta));
  const reason = "restock";
  const inventoryHistory =
    await generate_random_shopping_mall_seller_inventory_histories_create_inventory_history(
      sellerConnection,
      {
        body: {
          quantityDelta: positiveQuantityDelta,
          reason: reason,
        },
      },
    );
  // 3. Validate response
  typia.assert(inventoryHistory);
  // Check quantityDelta is positive
  TestValidator.predicate(
    "quantityDelta positive",
    inventoryHistory.quantityDelta > 0,
  );
  // Check reason matches
  TestValidator.equals("reason matches", inventoryHistory.reason, reason);
  // Validate that shoppingMallProductVariantId is UUID string
  typia.assert<string & tags.Format<"uuid">>(
    inventoryHistory.shoppingMallProductVariantId,
  );
  // Validate linked product variant summary
  typia.assert(inventoryHistory.productVariant);
  // Check timestamps that they are non-empty strings
  TestValidator.predicate(
    "createdAt is valid",
    typeof inventoryHistory.createdAt === "string" &&
      inventoryHistory.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is valid",
    typeof inventoryHistory.updatedAt === "string" &&
      inventoryHistory.updatedAt.length > 0,
  );
  // DeletedAt must be null as record is active
  TestValidator.equals(
    "deletedAt should be null",
    inventoryHistory.deletedAt,
    null,
  );
}
