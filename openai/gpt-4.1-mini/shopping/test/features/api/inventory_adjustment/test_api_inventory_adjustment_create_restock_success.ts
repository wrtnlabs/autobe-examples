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

export async function test_api_inventory_adjustment_create_restock_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller_password",
      shopName: RandomGenerator.name(2),
      shopDescription: null,
      logoUri: null,
    },
  });
  sellerConnection.headers = {
    Authorization: seller.token.access,
  };
  // 2. Define positive quantity delta for restock
  const quantityDelta = 10;
  // 3. Create inventory adjustment with restock reason
  const inventoryAdjustment =
    await generate_random_shopping_mall_seller_inventory_adjustments_create_inventory_adjustment(
      sellerConnection,
      {
        body: {
          quantityDelta,
          reason: "restock",
        },
      },
    );
  // 4. Validate inventory history response
  typia.assert(inventoryAdjustment);
  TestValidator.equals(
    "quantity delta matches",
    inventoryAdjustment.quantityDelta,
    quantityDelta,
  );
  TestValidator.equals("reason matches", inventoryAdjustment.reason, "restock");
  TestValidator.predicate(
    "valid createdAt timestamp",
    !isNaN(Date.parse(inventoryAdjustment.createdAt)),
  );
  TestValidator.predicate(
    "valid updatedAt timestamp",
    !isNaN(Date.parse(inventoryAdjustment.updatedAt)),
  );
  TestValidator.equals(
    "shoppingMallProductVariantId is string",
    typeof inventoryAdjustment.shoppingMallProductVariantId,
    "string",
  );
  TestValidator.predicate(
    "stock quantity updated correctly",
    inventoryAdjustment.productVariant.stockQuantity >= quantityDelta,
  );
}
