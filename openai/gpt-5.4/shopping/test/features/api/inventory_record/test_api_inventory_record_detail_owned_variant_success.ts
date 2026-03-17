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

export async function test_api_inventory_record_detail_owned_variant_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  typia.assert(
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSeller.IJoin,
    }),
  );
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 15000,
          status: "active",
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const variantBody = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    option_summary: `${RandomGenerator.pick(["Red", "Blue", "Black"] as const)} / ${RandomGenerator.pick(["S", "M", "L"] as const)}`,
    price: 17500,
  } satisfies IShoppingMallProductVariant.ICreate;
  const variant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: variantBody,
      },
    );
  typia.assert(variant);
  const occurredAt = new Date().toISOString();
  const inventoryBody = {
    quantity_change: 12,
    reason: "initial warehouse restock",
    occurred_at: occurredAt,
  } satisfies IShoppingMallInventoryRecord.ICreate;
  const createdRecord =
    await generate_random_shopping_mall_seller_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: inventoryBody,
      },
    );
  typia.assert(createdRecord);
  const found =
    await api.functional.shoppingMall.seller.seller_products.variants.inventory_records.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        inventoryRecordId: createdRecord.id,
      },
    );
  typia.assert(found);
  TestValidator.equals("inventory record id", found.id, createdRecord.id);
  TestValidator.equals(
    "inventory record variant id",
    found.productVariant.id,
    createdRecord.productVariant.id,
  );
  TestValidator.equals(
    "inventory record variant matches created variant",
    found.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "inventory record variant sku_code",
    found.productVariant.sku_code,
    createdRecord.productVariant.sku_code,
  );
  TestValidator.equals(
    "inventory record variant option_summary",
    found.productVariant.option_summary,
    createdRecord.productVariant.option_summary,
  );
  TestValidator.equals(
    "inventory record variant price",
    found.productVariant.price,
    createdRecord.productVariant.price,
  );
  TestValidator.equals(
    "inventory quantity_change requested",
    found.quantity_change,
    inventoryBody.quantity_change,
  );
  TestValidator.equals(
    "inventory quantity_change persisted",
    found.quantity_change,
    createdRecord.quantity_change,
  );
  TestValidator.equals(
    "inventory reason requested",
    found.reason,
    inventoryBody.reason,
  );
  TestValidator.equals(
    "inventory reason persisted",
    found.reason,
    createdRecord.reason,
  );
  TestValidator.equals(
    "inventory occurred_at requested",
    found.occurred_at,
    inventoryBody.occurred_at,
  );
  TestValidator.equals(
    "inventory occurred_at persisted",
    found.occurred_at,
    createdRecord.occurred_at,
  );
  TestValidator.equals(
    "inventory created_at preserved",
    found.created_at,
    createdRecord.created_at,
  );
  TestValidator.equals(
    "inventory updated_at preserved",
    found.updated_at,
    createdRecord.updated_at,
  );
  TestValidator.equals(
    "inventory deleted_at preserved",
    found.deleted_at,
    createdRecord.deleted_at,
  );
  TestValidator.equals(
    "inventory record active deleted_at",
    found.deleted_at,
    null,
  );
}
