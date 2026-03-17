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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_record_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = typia.assert(
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shopName: RandomGenerator.name(1),
        shopDescription: null,
        logoImage: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    }),
  );
  // 2. Create product under this seller
  const product = typia.assert(
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          basePrice: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<100000>
          >(),
        },
      },
    ),
  );
  // 3. Create product variant under this product
  const variant = typia.assert(
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_values: {
            color: RandomGenerator.pick([
              "red",
              "blue",
              "green",
              "black",
              "white",
            ] as const),
            size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
          },
          price: typia.random<
            number & tags.Minimum<0.01> & tags.Maximum<999999.99>
          >(),
        },
        params: {
          productId: product.id,
        },
      },
    ),
  );
  // 4. Create manual inventory adjustment record (positive quantity for restocking)
  const inventoryRecord = typia.assert(
    await generate_random_shopping_mall_seller_variants_inventory_adjust(
      sellerConnection,
      {
        body: {
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          variantId: variant.id,
        },
      },
    ),
  );
  // 5. Retrieve the inventory record by owner
  const retrievedRecord = typia.assert(
    await api.functional.shoppingMall.seller.variants.inventory.at(
      sellerConnection,
      {
        variantId: variant.id,
        recordId: inventoryRecord.id,
      },
    ),
  );
  // 6. Validate record properties match the created record
  TestValidator.equals(
    "record id matches",
    retrievedRecord.id,
    inventoryRecord.id,
  );
  TestValidator.equals(
    "variant id matches",
    retrievedRecord.variant_id,
    variant.id,
  );
  TestValidator.equals(
    "quantity change matches",
    retrievedRecord.quantity_change,
    inventoryRecord.quantity_change,
  );
  TestValidator.equals(
    "reason matches",
    retrievedRecord.reason,
    inventoryRecord.reason,
  );
  // 7. Validate manual adjustment record has seller_id populated and system FKs are null
  TestValidator.equals(
    "seller_id references the authenticated seller",
    retrievedRecord.seller_id,
    seller.id,
  );
  TestValidator.predicate(
    "order_id is null for manual adjustment",
    retrievedRecord.order_id === null,
  );
  TestValidator.predicate(
    "cancellation_request_id is null for manual adjustment",
    retrievedRecord.cancellation_request_id === null,
  );
  TestValidator.predicate(
    "refund_request_id is null for manual adjustment",
    retrievedRecord.refund_request_id === null,
  );
}
