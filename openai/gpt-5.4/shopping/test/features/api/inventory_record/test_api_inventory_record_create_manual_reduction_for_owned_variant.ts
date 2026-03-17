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

export async function test_api_inventory_record_create_manual_reduction_for_owned_variant(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://seller.example.com/join",
      referrer: "https://seller.example.com",
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
  const variant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: `sku-${RandomGenerator.alphaNumeric(8)}`,
          option_summary: `${RandomGenerator.name(1)} / ${RandomGenerator.name(1)}`,
          price: null,
        },
      },
    );
  typia.assert(variant);
  const reductionMagnitude = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number;
  const quantityChange = -reductionMagnitude satisfies number as number;
  const reason = `Damaged stock write-down ${RandomGenerator.alphabets(6)}`;
  const occurredAt = new Date().toISOString();
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
  TestValidator.equals(
    "inventory record keeps signed negative quantity change",
    inventoryRecord.quantity_change,
    quantityChange,
  );
  TestValidator.equals(
    "inventory record keeps reason",
    inventoryRecord.reason,
    reason,
  );
  TestValidator.equals(
    "inventory record keeps occurred_at",
    inventoryRecord.occurred_at,
    occurredAt,
  );
  TestValidator.equals(
    "inventory record belongs to created variant",
    inventoryRecord.productVariant.id,
    variant.id,
  );
  TestValidator.notEquals(
    "inventory record creates a distinct ledger entry id",
    inventoryRecord.id,
    variant.id,
  );
  TestValidator.predicate(
    "inventory record represents a manual reduction with a negative delta",
    inventoryRecord.quantity_change < 0,
  );
}
