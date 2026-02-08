import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_variant_update_sku_code_uniqueness_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = sellerAuth.token.access;
  // 2. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  const productId: string = (
    product as unknown as {
      id: string;
    }
  ).id;
  // 3. Create initial variants with unique SKUs
  const initialVariants = [
    {
      sku_code: `sku001-${RandomGenerator.alphabets(5)}`,
      price_override: 1000,
      stock_quantity: 10,
    },
    {
      sku_code: `sku002-${RandomGenerator.alphabets(5)}`,
      price_override: 1500,
      stock_quantity: 5,
    },
  ];
  // 4. Update variants for the product
  await api.functional.shoppingMall.seller.products.variants.updateVariants(
    sellerConnection,
    {
      productId,
      body: { variants: initialVariants },
    },
  );
  // 5. Attempt to update variants with duplicate SKU codes
  const duplicateSkuCode = initialVariants[0].sku_code;
  const duplicateVariants = [
    {
      sku_code: duplicateSkuCode,
      price_override: 2000,
      stock_quantity: 20,
    },
    {
      sku_code: duplicateSkuCode, // duplicate SKU
      price_override: 2500,
      stock_quantity: 15,
    },
  ];
  // 6. Validate update with duplicate SKUs fails
  await TestValidator.error("duplicate SKU code validation", async () => {
    await api.functional.shoppingMall.seller.products.variants.updateVariants(
      sellerConnection,
      {
        productId,
        body: { variants: duplicateVariants },
      },
    );
  });
}
