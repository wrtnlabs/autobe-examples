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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_seller_inventory_history_retrieval_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  // Update sellerConnection with Authorization header
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = authorized.token.access;
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(product);
  // 3. Add a product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        params: { productId: (product as any).id ?? (product as any).product_id },
        body: {},
      },
    );
  typia.assert(variant);
  // 4. Attempt to retrieve inventory history with non-existent inventoryHistoryId
  // Use a random UUID that is unlikely to exist
  const fakeInventoryHistoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "inventory history retrieval for non-existing inventoryHistoryId returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.productVariants.inventoryHistories.atInventoryHistory(
        sellerConnection,
        {
          variantId: (variant as any).id ?? (variant as any).variant_id,
          inventoryHistoryId: fakeInventoryHistoryId,
        },
      );
    },
  );
}
