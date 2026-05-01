import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import type { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_order_creation_multi_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup — create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller A — join, create product, variant, add stock
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  typia.assert(productA);
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: productA.id },
        body: {
          code: "SELLER-A-001",
          optionValues: [{ key: "color", value: "Blue" }],
        },
      },
    );
  typia.assert(variantA);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerAConnection,
    {
      params: { productId: productA.id, variantId: variantA.id },
      body: {
        quantity_change: 5 satisfies number as number,
        reason: "Initial stock",
      },
    },
  );
  // 3. Seller B — join, create product, variant, add stock
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {});
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerBConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  typia.assert(productB);
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerBConnection,
      {
        params: { productId: productB.id },
        body: {
          code: "SELLER-B-001",
          optionValues: [{ key: "color", value: "Green" }],
        },
      },
    );
  typia.assert(variantB);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerBConnection,
    {
      params: { productId: productB.id, variantId: variantB.id },
      body: {
        quantity_change: 3 satisfies number as number,
        reason: "Initial stock",
      },
    },
  );
  // 4. Customer — join and place order
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const effectivePriceA = variantA.price ?? variantA.base_price;
  const effectivePriceB = variantB.price ?? variantB.base_price;
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          { variant_id: variantA.id, quantity: 2 },
          { variant_id: variantB.id, quantity: 1 },
        ],
      },
    },
  );
  typia.assert(order);
  // 5. Validation
  const itemA = order.items.find((i) => i.variant.id === variantA.id)!;
  const itemB = order.items.find((i) => i.variant.id === variantB.id)!;
  TestValidator.predicate("item A found", itemA !== undefined);
  TestValidator.predicate("item B found", itemB !== undefined);
  // Item status
  TestValidator.equals("item A status", itemA.status, "paid");
  TestValidator.equals("item B status", itemB.status, "paid");
  // Frozen unit prices
  TestValidator.equals("item A frozen price", itemA.price, effectivePriceA);
  TestValidator.equals("item B frozen price", itemB.price, effectivePriceB);
  // Order total
  const expectedTotal = effectivePriceA * 2 + effectivePriceB * 1;
  TestValidator.equals("order total price", order.total_price, expectedTotal);
  // Stock deductions
  TestValidator.equals(
    "variant A stock after order",
    itemA.variant.stock_quantity,
    3,
  );
  TestValidator.equals(
    "variant B stock after order",
    itemB.variant.stock_quantity,
    2,
  );
  // Snapshots non-null
  TestValidator.predicate(
    "item A productSnapshot non-null",
    itemA.productSnapshot !== null,
  );
  TestValidator.predicate(
    "item A variantSnapshot non-null",
    itemA.variantSnapshot !== null,
  );
  TestValidator.predicate(
    "item A sellerSnapshot non-null",
    itemA.sellerSnapshot !== null,
  );
  TestValidator.predicate(
    "item B productSnapshot non-null",
    itemB.productSnapshot !== null,
  );
  TestValidator.predicate(
    "item B variantSnapshot non-null",
    itemB.variantSnapshot !== null,
  );
  TestValidator.predicate(
    "item B sellerSnapshot non-null",
    itemB.sellerSnapshot !== null,
  );
  // Variant snapshot SKU codes
  TestValidator.equals(
    "item A variant snapshot SKU",
    itemA.variantSnapshot!.sku_code,
    "SELLER-A-001",
  );
  TestValidator.equals(
    "item B variant snapshot SKU",
    itemB.variantSnapshot!.sku_code,
    "SELLER-B-001",
  );
  // Seller snapshots have distinct IDs (confirming different sellers)
  TestValidator.notEquals(
    "seller snapshots are distinct",
    itemA.sellerSnapshot!.id,
    itemB.sellerSnapshot!.id,
  );
}
