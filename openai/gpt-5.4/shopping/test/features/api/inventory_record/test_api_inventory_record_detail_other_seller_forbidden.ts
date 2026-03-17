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

export async function test_api_inventory_record_detail_other_seller_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnectionA: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerConnectionA, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnectionA,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          base_price: 100,
          status: RandomGenerator.pick(["sale", "draft"] as const),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  TestValidator.equals("seller A owns product", product.seller.id, sellerA.id);
  const variant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnectionA,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          option_summary: RandomGenerator.paragraph({ sentences: 3 }),
          price: null,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  TestValidator.equals(
    "variant belongs to product",
    variant.product.id,
    product.id,
  );
  const inventoryCreateBody = {
    quantity_change: 10,
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    occurred_at: new Date().toISOString(),
  } satisfies IShoppingMallInventoryRecord.ICreate;
  const inventoryRecord =
    await generate_random_shopping_mall_seller_seller_products_variants_inventory_records_create(
      sellerConnectionA,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: inventoryCreateBody,
      },
    );
  typia.assert(inventoryRecord);
  TestValidator.equals(
    "inventory record belongs to variant",
    inventoryRecord.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "inventory reason matches input",
    inventoryRecord.reason,
    inventoryCreateBody.reason,
  );
  TestValidator.equals(
    "inventory occurred_at matches input",
    inventoryRecord.occurred_at,
    inventoryCreateBody.occurred_at,
  );
  const sellerConnectionB: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerConnectionB, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  TestValidator.notEquals("different sellers", sellerB.id, sellerA.id);
  await TestValidator.httpError(
    "other seller cannot read inventory record detail",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.seller.seller_products.variants.inventory_records.at(
        sellerConnectionB,
        {
          productId: product.id,
          variantId: variant.id,
          inventoryRecordId: inventoryRecord.id,
        },
      );
    },
  );
}
