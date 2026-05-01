import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_order_detail_partial_fulfillment_mixed_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and approves seller
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuthorized.id,
  });
  // 2. Seller creates product and two variants with inventory
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant1);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      body: {
        quantity_change: 10,
        reason: "Initial stock",
      },
      params: { productId: product.id, variantId: variant1.id },
    },
  );
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant2);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      body: {
        quantity_change: 10,
        reason: "Initial stock",
      },
      params: { productId: product.id, variantId: variant2.id },
    },
  );
  // 3. Customer registers and adds variants to cart
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: { productVariantId: variant1.id, quantity: 1 },
    },
  );
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: { productVariantId: variant2.id, quantity: 1 },
    },
  );
  // 4. Customer places order with both variants
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            variant_id: variant1.id,
            quantity: 1,
          } satisfies IShoppingMallOrderItem.ICreate,
          {
            variant_id: variant2.id,
            quantity: 1,
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
      },
    },
  );
  typia.assert(order);
  // 5. Seller creates shipment with only the first order item
  const firstItemId = order.items[0].id;
  const shipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId: order.id,
        body: {
          orderItemIds: [firstItemId],
          carrier_name: "FedEx",
          tracking_number: "TRACK-12345-XYZ",
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 6. Customer retrieves order detail and validates partial fulfillment
  const orderDetail = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    { orderCode: order.code },
  );
  typia.assert(orderDetail);
  const shippedItem = orderDetail.items.find(
    (item) => item.status === "shipped",
  );
  const paidItem = orderDetail.items.find((item) => item.status === "paid");
  TestValidator.predicate("shipped item exists", shippedItem !== undefined);
  TestValidator.predicate("paid item exists", paidItem !== undefined);
  // 6.1. Shipped item linked to shipment with correct carrier and tracking
  TestValidator.predicate(
    "shipped item has shipment reference",
    shippedItem!.shipment !== null,
  );
  TestValidator.equals(
    "shipment carrier name",
    shippedItem!.shipment!.carrier_name,
    "FedEx",
  );
  TestValidator.equals(
    "shipment tracking number",
    shippedItem!.shipment!.tracking_number,
    "TRACK-12345-XYZ",
  );
  // 6.2. Unshipped item remains paid with null shipment
  TestValidator.equals("paid item shipment is null", paidItem!.shipment, null);
  // 6.3. Overall order status is shipped
  TestValidator.equals(
    "order status is shipped",
    orderDetail.status,
    "shipped",
  );
  // 6.4. Shipment details
  TestValidator.predicate(
    "shipment array has one entry",
    orderDetail.shipments.length === 1,
  );
  const orderShipment = orderDetail.shipments[0];
  TestValidator.equals(
    "shipment carrier name matches",
    orderShipment.carrier_name,
    "FedEx",
  );
  TestValidator.equals(
    "shipment tracking number matches",
    orderShipment.tracking_number,
    "TRACK-12345-XYZ",
  );
  TestValidator.equals(
    "shipment not yet delivered",
    orderShipment.delivered_at,
    null,
  );
  // Validate shipment-to-item mapping
  TestValidator.predicate(
    "shipment contains shipped item",
    orderShipment.orderItems.some((oi) => oi.id === shippedItem!.id),
  );
  TestValidator.predicate(
    "shipment does not contain paid item",
    !orderShipment.orderItems.some((oi) => oi.id === paidItem!.id),
  );
}
