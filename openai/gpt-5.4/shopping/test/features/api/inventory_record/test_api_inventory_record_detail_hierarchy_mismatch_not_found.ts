import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_record_detail_hierarchy_mismatch_not_found(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  const productA =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          base_price: 100,
          status: "active",
        },
      },
    );
  typia.assert(productA);
  const productB =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          base_price: 200,
          status: "active",
        },
      },
    );
  typia.assert(productB);
  const variantA =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productA.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          option_summary: RandomGenerator.paragraph({ sentences: 2 }),
          price: null,
        },
      },
    );
  typia.assert(variantA);
  const variantB =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productB.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          option_summary: RandomGenerator.paragraph({ sentences: 2 }),
          price: null,
        },
      },
    );
  typia.assert(variantB);
  const inventoryRecord =
    await generate_random_shopping_mall_seller_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: {
          productId: productA.id,
          variantId: variantA.id,
        },
        body: {
          quantity_change: 10,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          occurred_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(inventoryRecord);
  const found =
    await api.functional.shoppingMall.seller.seller_products.variants.inventory_records.at(
      sellerConnection,
      {
        productId: productA.id,
        variantId: variantA.id,
        inventoryRecordId: inventoryRecord.id,
      },
    );
  typia.assert(found);
  TestValidator.equals(
    "control record id matches",
    found.id,
    inventoryRecord.id,
  );
  TestValidator.equals(
    "control record variant id matches",
    found.productVariant.id,
    variantA.id,
  );
  await TestValidator.httpError(
    "rejects variant from another product branch",
    [400, 403, 404],
    async () => {
      await api.functional.shoppingMall.seller.seller_products.variants.inventory_records.at(
        sellerConnection,
        {
          productId: productA.id,
          variantId: variantB.id,
          inventoryRecordId: inventoryRecord.id,
        },
      );
    },
  );
  await TestValidator.httpError(
    "rejects inventory record outside named product and variant branch",
    [400, 403, 404],
    async () => {
      await api.functional.shoppingMall.seller.seller_products.variants.inventory_records.at(
        sellerConnection,
        {
          productId: productB.id,
          variantId: variantB.id,
          inventoryRecordId: inventoryRecord.id,
        },
      );
    },
  );
}
