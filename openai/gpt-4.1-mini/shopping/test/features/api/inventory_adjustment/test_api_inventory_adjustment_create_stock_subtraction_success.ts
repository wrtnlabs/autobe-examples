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
import { generate_random_shopping_mall_seller_inventory_adjustments_create_inventory_adjustment } from "../../../generate/generate_random_shopping_mall_seller_inventory_adjustments_create_inventory_adjustment";
import { prepare_random_shopping_mall_inventory_history } from "../../../prepare/prepare_random_shopping_mall_inventory_history";

export async function test_api_inventory_adjustment_create_stock_subtraction_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        password: "testpass1234",
        shopName: "Test Shop",
        email: `seller_${Date.now()}@example.com`,
        shopDescription: "E2E test shop for inventory",
        logoUri: null,
      },
    });
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // 2. Create inventory adjustment - subtract stock quantity
  // Using a realistic variant ID and negative quantityDelta
  // We'll generate an initial adjustment with positive quantity to ensure variant has stock
  const initialAdjustment =
    await generate_random_shopping_mall_seller_inventory_adjustments_create_inventory_adjustment(
      sellerConnection,
      {
        body: {
          quantityDelta: 10,
          reason: "restock",
        },
      },
    );
  typia.assert(initialAdjustment);
  // Subtract stock
  const subtractionQuantity = -3;
  const subtractionReason = "order";
  const inventoryAdjustment: IShoppingMallInventoryHistory =
    await generate_random_shopping_mall_seller_inventory_adjustments_create_inventory_adjustment(
      sellerConnection,
      {
        body: {
          shoppingMallProductVariantId:
            initialAdjustment.shoppingMallProductVariantId,
          quantityDelta: subtractionQuantity,
          reason: subtractionReason,
        },
      },
    );
  typia.assert(inventoryAdjustment);
  // 3. Validate the adjustment record
  TestValidator.equals(
    "shoppingMallProductVariantId matches",
    inventoryAdjustment.shoppingMallProductVariantId,
    initialAdjustment.shoppingMallProductVariantId,
  );
  TestValidator.equals(
    "quantityDelta is negative",
    inventoryAdjustment.quantityDelta,
    subtractionQuantity,
  );
  TestValidator.equals(
    "reason is correct",
    inventoryAdjustment.reason,
    subtractionReason,
  );
  // 4. Validate timestamps
  TestValidator.predicate(
    "createdAt is valid ISO date-time",
    () => !isNaN(Date.parse(inventoryAdjustment.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO date-time",
    () => !isNaN(Date.parse(inventoryAdjustment.updatedAt)),
  );
  // 5. Validate deletedAt is null
  TestValidator.equals(
    "deletedAt is null",
    inventoryAdjustment.deletedAt,
    null,
  );
  // 6. Validate product variant relation
  typia.assert(inventoryAdjustment.productVariant);
  TestValidator.equals(
    "productVariant id matches",
    inventoryAdjustment.productVariant.id,
    initialAdjustment.shoppingMallProductVariantId,
  );
  TestValidator.predicate(
    "productVariant stockQuantity is >= 0",
    inventoryAdjustment.productVariant.stockQuantity >= 0,
  );
}
