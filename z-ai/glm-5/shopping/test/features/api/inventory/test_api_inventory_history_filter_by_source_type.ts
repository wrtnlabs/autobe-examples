import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
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

export async function test_api_inventory_history_filter_by_source_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
      logoImage: null,
      href: "https://test.com",
      referrer: "https://test.com",
      ip: "127.0.0.1",
    },
  });
  typia.assert(seller);
  // 2. Create product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Create variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Create multiple manual inventory adjustments
  const adjustment1 =
    await generate_random_shopping_mall_seller_variants_inventory_adjust(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: 100,
          reason: "Initial stock",
        },
      },
    );
  typia.assert(adjustment1);
  const adjustment2 =
    await generate_random_shopping_mall_seller_variants_inventory_adjust(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: 50,
          reason: "Restock from supplier",
        },
      },
    );
  typia.assert(adjustment2);
  const adjustment3 =
    await generate_random_shopping_mall_seller_variants_inventory_adjust(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: -10,
          reason: "Damaged goods",
        },
      },
    );
  typia.assert(adjustment3);
  // 5. Query with sourceType filter = 'manual'
  const manualRecords =
    await api.functional.shoppingMall.seller.variants.inventory.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          sourceType: "manual",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(manualRecords);
  // 6. Validate all records have sourceType === 'manual'
  TestValidator.predicate(
    "All records should have sourceType 'manual'",
    manualRecords.data.every((record) => record.sourceType === "manual"),
  );
  // 7. Validate count matches created manual records
  TestValidator.equals(
    "Manual records count should be 3",
    manualRecords.data.length,
    3,
  );
  // 8. Query with sourceType filter = 'all'
  const allRecords =
    await api.functional.shoppingMall.seller.variants.inventory.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          sourceType: "all",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(allRecords);
  // 9. Validate all records are returned
  TestValidator.equals(
    "All records count should be 3",
    allRecords.data.length,
    3,
  );
  // 10. Query with sourceType filter = 'order' should return empty
  const orderRecords =
    await api.functional.shoppingMall.seller.variants.inventory.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          sourceType: "order",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(orderRecords);
  TestValidator.equals(
    "Order records should be empty",
    orderRecords.data.length,
    0,
  );
}
