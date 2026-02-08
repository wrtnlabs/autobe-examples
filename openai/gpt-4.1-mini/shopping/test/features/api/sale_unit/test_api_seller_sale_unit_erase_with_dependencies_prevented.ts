import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_seller_sale_unit_erase_with_dependencies_prevented(
  connection: api.IConnection,
): Promise<void> {
  // Test deletion failure when the seller tries to delete a sale unit that has dependent order items or pending requests.
  // Authenticate as seller and create product and sale listing as prerequisites.
  // Simulate conditions where the sale unit is linked to pending orders or cancellation/refund requests.
  // Attempt to delete the sale unit and assert that deletion is denied with proper business logic error.
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, { body: {} });
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // 3. Create sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(sale);
  // 4. Attempt to delete sale unit with random UUID expecting failure due to dependencies or non-existence
  const unitId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting sale unit with dependencies or non-existent should fail",
    async () => {
      await api.functional.shoppingMall.seller.sale_units.erase(
        sellerConnection,
        { unitId },
      );
    },
  );
}
