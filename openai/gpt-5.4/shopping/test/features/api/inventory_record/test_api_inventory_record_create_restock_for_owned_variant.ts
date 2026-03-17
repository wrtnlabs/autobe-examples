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

export async function test_api_inventory_record_create_restock_for_owned_variant(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >() satisfies number as number,
          status: "active",
        },
      },
    );
  typia.assert(product);
  const variantPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >() satisfies number as number;
  const variant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_summary: `${RandomGenerator.pick(["Red", "Blue", "Black"] as const)} / ${RandomGenerator.pick(["S", "M", "L"] as const)}`,
          price: variantPrice,
        },
      },
    );
  typia.assert(variant);
  const quantityChange = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number;
  TestValidator.predicate("restock quantity is positive", quantityChange > 0);
  const occurredAt = new Date().toISOString();
  const reason = `restock-${RandomGenerator.alphabets(6)}`;
  const inventoryRecord =
    await generate_random_shopping_mall_seller_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {
          quantity_change: quantityChange,
          reason,
          occurred_at: occurredAt,
        },
      },
    );
  typia.assert(inventoryRecord);
  TestValidator.notEquals(
    "inventory record has its own identifier",
    inventoryRecord.id,
    variant.id,
  );
  TestValidator.equals(
    "inventory record quantity change matches request",
    inventoryRecord.quantity_change,
    quantityChange,
  );
  TestValidator.equals(
    "inventory record reason matches request",
    inventoryRecord.reason,
    reason,
  );
  TestValidator.equals(
    "inventory record occurred_at matches request",
    inventoryRecord.occurred_at,
    occurredAt,
  );
  TestValidator.equals(
    "inventory record targets created variant",
    inventoryRecord.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "inventory record productVariant sku_code matches variant",
    inventoryRecord.productVariant.sku_code,
    variant.sku_code,
  );
  TestValidator.equals(
    "inventory record productVariant option_summary matches variant",
    inventoryRecord.productVariant.option_summary,
    variant.option_summary,
  );
  TestValidator.equals(
    "inventory record productVariant price matches variant",
    inventoryRecord.productVariant.price,
    variant.price,
  );
  TestValidator.equals(
    "inventory record deleted_at is null on creation",
    inventoryRecord.deleted_at,
    null,
  );
  TestValidator.predicate(
    "inventory record created_at is populated",
    inventoryRecord.created_at.length > 0,
  );
  TestValidator.predicate(
    "inventory record updated_at is populated",
    inventoryRecord.updated_at.length > 0,
  );
}
