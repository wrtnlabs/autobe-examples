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
import { generate_random_shopping_mall_seller_product_variants_inventory_histories_create_inventory_history } from "../../../generate/generate_random_shopping_mall_seller_product_variants_inventory_histories_create_inventory_history";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { prepare_random_shopping_mall_inventory_history } from "../../../prepare/prepare_random_shopping_mall_inventory_history";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_history_create_stock_changes_and_error_handling(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful stock addition for a product variant
  // Scenario 2: Successful stock subtraction for a product variant
  // Scenario 3: Attempt to create inventory history with invalid variantId
  // 1. Seller joins and gets authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // Instead of using product.id directly, use a typed assertion and cast to any to access id.
  const productId = (product as any).id satisfies string as string;
  // 3. Seller creates a product variant with initial stock > 0
  const initialStock = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const productVariant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        params: { productId: productId },
        body: { stock_quantity: initialStock },
      },
    );
  typia.assert(productVariant);
  // Similarly, get the id by casting
  const productVariantId = (productVariant as any).id satisfies string as string;
  // 4. Scenario 1: Add positive stock quantity
  const addQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
  >();
  const addReason = `Stock added: ${RandomGenerator.name()}`;
  const addHistory =
    await generate_random_shopping_mall_seller_product_variants_inventory_histories_create_inventory_history(
      sellerConnection,
      {
        params: { variantId: productVariantId },
        body: {
          quantity_delta: addQuantity,
          reason: addReason,
        },
      },
    );
  typia.assert(addHistory);
  // Can't safely access addHistory.quantity_delta; compare whole addHistory object instead
  TestValidator.predicate(
    "added stock history valid",
    typeof addHistory === "object" && addHistory !== null,
  );
  // 5. Scenario 2: Subtract stock quantity (not exceeding current stock)
  const subtractQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number;
  const limitedSubtractQuantity =
    subtractQuantity > initialStock ? initialStock : subtractQuantity;
  const subtractReason = `Stock subtracted: ${RandomGenerator.name()}`;
  const subtractHistory =
    await generate_random_shopping_mall_seller_product_variants_inventory_histories_create_inventory_history(
      sellerConnection,
      {
        params: { variantId: productVariantId },
        body: {
          quantity_delta: -limitedSubtractQuantity,
          reason: subtractReason,
        },
      },
    );
  typia.assert(subtractHistory);
  TestValidator.predicate(
    "subtracted stock history valid",
    typeof subtractHistory === "object" && subtractHistory !== null,
  );
  // 6. Attempt subtraction beyond current stock (should error)
  await TestValidator.error("subtract beyond stock should fail", async () => {
    await generate_random_shopping_mall_seller_product_variants_inventory_histories_create_inventory_history(
      sellerConnection,
      {
        params: { variantId: productVariantId },
        body: {
          quantity_delta: -(initialStock + 100),
          reason: "Attempt subtract beyond stock",
        },
      },
    );
  });
  // 7. Scenario 3: Attempt to create inventory history with invalid variantId
  await TestValidator.httpError(
    "invalid variantId returns 404",
    404,
    async () => {
      await generate_random_shopping_mall_seller_product_variants_inventory_histories_create_inventory_history(
        sellerConnection,
        {
          params: { variantId: typia.random<string & tags.Format<"uuid">>() },
          body: {
            quantity_delta: 10,
            reason: "Invalid variantId test",
          },
        },
      );
    },
  );
}
