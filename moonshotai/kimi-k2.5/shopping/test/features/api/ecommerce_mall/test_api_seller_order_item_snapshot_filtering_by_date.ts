import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import type { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshot";
import type { IEcommerceMallOrderItemVariantSnapshotAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshotAttribute";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test that a seller can retrieve and filter order item snapshots by creation date range.
 * After setting up a complete order with associated snapshots (product snapshot, variant snapshot,
 * seller profile snapshot captured at order time), query order item snapshots with date range
 * filters (createdAtFrom and createdAtTo) to narrow results to specific time windows.
 * Verify that the snapshots contain the immutable product, variant, and seller profile
 * information as they existed at the time of purchase. Validate that filtering works
 * correctly with combined parameters.
 */
export async function test_api_seller_order_item_snapshot_filtering_by_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Setup seller and create product with variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          stock: 100,
        },
      },
    );
  typia.assert(variant);
  // 3. Setup customer, add to cart, and checkout to create order with snapshots
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Verify order has order items
  TestValidator.predicate("order has order items", order.orderItems.length > 0);
  const orderItem = typia.assert<IEcommerceMallOrderItem.ISummary>(
    order.orderItems[0],
  );
  // Record the order creation time for date filtering
  const orderCreatedAt = new Date(order.createdAt);
  const beforeOrder = new Date(orderCreatedAt.getTime() - 24 * 60 * 60 * 1000); // 1 day before
  const afterOrder = new Date(orderCreatedAt.getTime() + 24 * 60 * 60 * 1000); // 1 day after
  // 4. Query snapshots as seller with date range filters
  const snapshotsResponse: IPageIEcommerceMallOrderItemSnapshot =
    await api.functional.ecommerceMall.seller.orders.items.snapshots.index(
      sellerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        body: {
          createdAtFrom: beforeOrder.toISOString(),
          createdAtTo: afterOrder.toISOString(),
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 5. Validate response structure and content
  TestValidator.predicate(
    "snapshots response has data",
    snapshotsResponse.data.length > 0,
  );
  const snapshot = snapshotsResponse.data[0];
  typia.assert(snapshot);
  // Validate snapshot contains immutable product information
  TestValidator.predicate(
    "snapshot has product snapshot",
    snapshot.productSnapshot !== null && snapshot.productSnapshot !== undefined,
  );
  TestValidator.equals(
    "product snapshot name matches",
    snapshot.productSnapshot.name,
    product.name,
  );
  // Validate snapshot contains immutable variant information
  TestValidator.predicate(
    "snapshot has variant snapshot",
    snapshot.variantSnapshot !== null && snapshot.variantSnapshot !== undefined,
  );
  TestValidator.equals(
    "variant snapshot SKU matches",
    snapshot.variantSnapshot.skuCode,
    variant.skuCode,
  );
  // Validate snapshot contains immutable seller information
  TestValidator.predicate(
    "snapshot has seller snapshot",
    snapshot.sellerSnapshot !== null && snapshot.sellerSnapshot !== undefined,
  );
  // 6. Test filtering with date range that excludes the order
  const futureDate = new Date(
    orderCreatedAt.getTime() + 7 * 24 * 60 * 60 * 1000,
  ); // 7 days after
  const farFutureDate = new Date(
    orderCreatedAt.getTime() + 14 * 24 * 60 * 60 * 1000,
  ); // 14 days after
  const emptySnapshotsResponse: IPageIEcommerceMallOrderItemSnapshot =
    await api.functional.ecommerceMall.seller.orders.items.snapshots.index(
      sellerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        body: {
          createdAtFrom: futureDate.toISOString(),
          createdAtTo: farFutureDate.toISOString(),
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(emptySnapshotsResponse);
  TestValidator.equals(
    "future date range returns no snapshots",
    emptySnapshotsResponse.data.length,
    0,
  );
  // 7. Test filtering with snapshot type parameter combined with date range
  const productSnapshotsResponse: IPageIEcommerceMallOrderItemSnapshot =
    await api.functional.ecommerceMall.seller.orders.items.snapshots.index(
      sellerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        body: {
          snapshotType: "product",
          createdAtFrom: beforeOrder.toISOString(),
          createdAtTo: afterOrder.toISOString(),
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(productSnapshotsResponse);
  TestValidator.predicate(
    "product type filter returns results",
    productSnapshotsResponse.data.length > 0,
  );
}
