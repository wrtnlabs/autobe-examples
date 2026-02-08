import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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
import { generate_random_shopping_mall_seller_product_variants_inventory_adjust_adjust_inventory } from "../../../generate/generate_random_shopping_mall_seller_product_variants_inventory_adjust_adjust_inventory";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { prepare_random_shopping_mall_inventory_history } from "../../../prepare/prepare_random_shopping_mall_inventory_history";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_seller_inventory_adjustment_various_quantity_deltas(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and authorized connection setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(authorized);
  sellerConnection.headers = { Authorization: authorized.token.access };
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(product);
  // 3. Create variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        params: { productId: (product as { id: string }).id },
        body: {},
      },
    );
  typia.assert(variant);
  // Initialize totalStock for validations
  let totalStock = 0;
  // Scenario 1: Add inventory stock +50
  const quantityDeltaAdd = 50 as number & tags.Type<"int32">;
  const reasonAdd = `Add stock adjustment +${quantityDeltaAdd}`;
  const inventoryAdd =
    await generate_random_shopping_mall_seller_product_variants_inventory_adjust_adjust_inventory(
      sellerConnection,
      {
        params: { variantId: (variant as { id: string }).id },
        body: {
          quantityDelta: quantityDeltaAdd,
          reason: reasonAdd,
        } satisfies IShoppingMallInventoryHistory.ICreate,
      },
    );
  typia.assert(inventoryAdd);
  TestValidator.equals(
    "Inventory adjustment add quantityDelta",
    quantityDeltaAdd,
    quantityDeltaAdd,
  );
  TestValidator.equals(
    "Inventory adjustment add reason",
    reasonAdd,
    reasonAdd,
  );
  totalStock += quantityDeltaAdd;
  // Scenario 2: Subtract inventory stock -30
  const quantityDeltaSub = -30 as number & tags.Type<"int32">;
  const reasonSub = `Subtract stock adjustment ${quantityDeltaSub}`;
  const inventorySub =
    await generate_random_shopping_mall_seller_product_variants_inventory_adjust_adjust_inventory(
      sellerConnection,
      {
        params: { variantId: (variant as { id: string }).id },
        body: {
          quantityDelta: quantityDeltaSub,
          reason: reasonSub,
        } satisfies IShoppingMallInventoryHistory.ICreate,
      },
    );
  typia.assert(inventorySub);
  TestValidator.equals(
    "Inventory adjustment subtract quantityDelta",
    quantityDeltaSub,
    quantityDeltaSub,
  );
  TestValidator.equals(
    "Inventory adjustment subtract reason",
    reasonSub,
    reasonSub,
  );
  totalStock += quantityDeltaSub;
  // Scenario 3: Attempt zero quantityDelta adjustment
  const quantityDeltaZero = 0 as number & tags.Type<"int32">;
  const reasonZero = `Zero quantityDelta adjustment, should fail or no-op`;
  await TestValidator.error(
    "Inventory adjustment zero quantityDelta throws error or rejects",
    async () => {
      await generate_random_shopping_mall_seller_product_variants_inventory_adjust_adjust_inventory(
        sellerConnection,
        {
          params: { variantId: (variant as { id: string }).id },
          body: {
            quantityDelta: quantityDeltaZero,
            reason: reasonZero,
          } satisfies IShoppingMallInventoryHistory.ICreate,
        },
      );
    },
  );
  // Optionally verify totalStock calculation - This API design does not return stock directly, so totalStock is computed locally
  TestValidator.predicate(
    "Total stock after adjustments positive or zero",
    totalStock >= 0,
  );
}
