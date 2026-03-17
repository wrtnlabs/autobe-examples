import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_record_detail_rejects_mismatched_nested_scope(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const product1 =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 100,
          status: RandomGenerator.alphabets(8),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product1);
  const variant1 =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          option_summary: RandomGenerator.paragraph({ sentences: 3 }),
          price: 120,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  const inventoryRecord1 =
    await generate_random_shopping_mall_seller_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: {
          productId: product1.id,
          variantId: variant1.id,
        },
        body: {
          quantity_change: 5 satisfies number & tags.Type<"int32">,
          reason: RandomGenerator.paragraph({ sentences: 4 }),
          occurred_at: new Date().toISOString(),
        } satisfies IShoppingMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord1);
  const product2 =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 200,
          status: RandomGenerator.alphabets(8),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product2);
  const variant2 =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          option_summary: RandomGenerator.paragraph({ sentences: 3 }),
          price: 220,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  TestValidator.equals(
    "inventory record belongs to first variant",
    inventoryRecord1.productVariant.id,
    variant1.id,
  );
  TestValidator.equals(
    "first variant belongs to first product",
    variant1.product.id,
    product1.id,
  );
  TestValidator.equals(
    "second variant belongs to second product",
    variant2.product.id,
    product2.id,
  );
  TestValidator.notEquals("variants are distinct", variant1.id, variant2.id);
  TestValidator.notEquals("products are distinct", product1.id, product2.id);
  const administratorConnection: api.IConnection = { host: connection.host };
  const administratorAuth = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(administratorAuth);
  await TestValidator.error(
    "rejects inventory record lookup when variant does not belong to product",
    async () => {
      await api.functional.shoppingMall.administrator.products.variants.inventory_records.at(
        administratorConnection,
        {
          productId: product1.id,
          variantId: variant2.id,
          inventoryRecordId: inventoryRecord1.id,
        },
      );
    },
  );
  await TestValidator.error(
    "rejects inventory record lookup when record chain is requested through different product scope",
    async () => {
      await api.functional.shoppingMall.administrator.products.variants.inventory_records.at(
        administratorConnection,
        {
          productId: product2.id,
          variantId: variant1.id,
          inventoryRecordId: inventoryRecord1.id,
        },
      );
    },
  );
}
