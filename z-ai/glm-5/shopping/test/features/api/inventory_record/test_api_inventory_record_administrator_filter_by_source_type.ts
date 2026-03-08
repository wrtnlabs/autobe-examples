import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_record_administrator_filter_by_source_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Seller creates a variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Seller creates a manual inventory restock record
  const manualRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: 100,
          reason: "Initial stock from supplier for filter test",
        },
      },
    );
  typia.assert(manualRecord);
  // 6. Administrator queries with source='manual' filter
  const manualResult =
    await api.functional.shoppingMall.administrator.variants.inventory_records.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          source: "manual",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(manualResult);
  // Verify manual filter returns the seller-initiated record
  TestValidator.predicate(
    "manual filter returns records",
    manualResult.data.length > 0,
  );
  TestValidator.predicate(
    "manual record has seller",
    manualResult.data[0].seller !== null,
  );
  TestValidator.equals(
    "manual record quantity",
    manualResult.data[0].quantityChange,
    100,
  );
  // 7. Administrator queries with source='order' filter (should be empty)
  const orderResult =
    await api.functional.shoppingMall.administrator.variants.inventory_records.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          source: "order",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(orderResult);
  // Verify order filter returns empty (no orders placed yet)
  TestValidator.equals(
    "order filter returns empty",
    orderResult.data.length,
    0,
  );
  // 8. Administrator queries with source='cancellation' filter (should be empty)
  const cancellationResult =
    await api.functional.shoppingMall.administrator.variants.inventory_records.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          source: "cancellation",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(cancellationResult);
  TestValidator.equals(
    "cancellation filter returns empty",
    cancellationResult.data.length,
    0,
  );
  // 9. Administrator queries with source='refund' filter (should be empty)
  const refundResult =
    await api.functional.shoppingMall.administrator.variants.inventory_records.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          source: "refund",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(refundResult);
  TestValidator.equals(
    "refund filter returns empty",
    refundResult.data.length,
    0,
  );
  // 10. Administrator queries without source filter (should return all records)
  const allResult =
    await api.functional.shoppingMall.administrator.variants.inventory_records.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {} satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(allResult);
  // Verify unfiltered query returns at least the manual record
  TestValidator.predicate(
    "unfiltered query returns records",
    allResult.data.length >= 1,
  );
}
