import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import type { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import type { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import type { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallOrderItemStatusLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { generate_random_e_commerce_mall_seller_shipments_create } from "../../../generate/generate_random_e_commerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_administrator_order_item_status_log_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator, seller, and customer accounts
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Step 2: Seller creates a product, variant, and inventory
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  const inventoryQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<1000>
  >();
  await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: {
        quantity_change: inventoryQuantity,
        reason: "Initial restock for test",
      } satisfies DeepPartial<IECommerceMallInventoryRecord.ICreate>,
    },
  );
  // Step 3: Customer creates an address, adds variant to cart, and places the order
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  await generate_random_e_commerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 1,
      } satisfies DeepPartial<IECommerceMallCartItem.ICreate>,
    },
  );
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      } satisfies DeepPartial<IECommerceMallOrder.ICreate>,
    },
  );
  typia.assert(order);
  const orderItemId: string = order.orderItems[0].id;
  // Step 4: Seller creates a shipment — generates 'shipped' status log
  // (from_status: 'paid', to_status: 'shipped', reason: 'shipment_created')
  const shipment = await api.functional.eCommerceMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        carrierName: RandomGenerator.name(),
        trackingNumber: RandomGenerator.alphaNumeric(12),
        orderItemIds: [orderItemId],
      } satisfies IECommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Step 5: Customer confirms delivery — generates 'delivered' status log
  // (from_status: 'shipped', to_status: 'delivered', reason: 'customer_delivery_confirmation')
  await api.functional.eCommerceMall.customer.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    {
      shipmentId: shipment.id,
    },
  );
  // Step 6: As administrator, test filtered status log queries
  // (a) Filter by to_status='shipped'
  const shippedLogs =
    await api.functional.eCommerceMall.administrator.orderItems.statusLogs.index(
      adminConnection,
      {
        itemId: orderItemId,
        body: {
          to_status: "shipped",
        } satisfies IECommerceMallOrderItemStatusLog.IRequest,
      },
    );
  typia.assert(shippedLogs);
  TestValidator.equals("shipped log count", shippedLogs.data.length, 1);
  TestValidator.equals(
    "shipped log orderItem id",
    shippedLogs.data[0].orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "shipped from_status",
    shippedLogs.data[0].from_status,
    "paid",
  );
  TestValidator.equals(
    "shipped to_status",
    shippedLogs.data[0].to_status,
    "shipped",
  );
  TestValidator.equals(
    "shipped reason",
    shippedLogs.data[0].reason,
    "shipment_created",
  );
  TestValidator.equals(
    "shipped pagination records",
    shippedLogs.pagination.records,
    1,
  );
  // (b) Filter by to_status='delivered'
  const deliveredLogs =
    await api.functional.eCommerceMall.administrator.orderItems.statusLogs.index(
      adminConnection,
      {
        itemId: orderItemId,
        body: {
          to_status: "delivered",
        } satisfies IECommerceMallOrderItemStatusLog.IRequest,
      },
    );
  typia.assert(deliveredLogs);
  TestValidator.equals("delivered log count", deliveredLogs.data.length, 1);
  TestValidator.equals(
    "delivered log orderItem id",
    deliveredLogs.data[0].orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "delivered from_status",
    deliveredLogs.data[0].from_status,
    "shipped",
  );
  TestValidator.equals(
    "delivered to_status",
    deliveredLogs.data[0].to_status,
    "delivered",
  );
  TestValidator.equals(
    "delivered reason",
    deliveredLogs.data[0].reason,
    "customer_delivery_confirmation",
  );
  TestValidator.equals(
    "delivered pagination records",
    deliveredLogs.pagination.records,
    1,
  );
  // (c) Filter by to_status='paid'
  const paidLogs =
    await api.functional.eCommerceMall.administrator.orderItems.statusLogs.index(
      adminConnection,
      {
        itemId: orderItemId,
        body: {
          to_status: "paid",
        } satisfies IECommerceMallOrderItemStatusLog.IRequest,
      },
    );
  typia.assert(paidLogs);
  TestValidator.equals("paid log count", paidLogs.data.length, 1);
  TestValidator.equals(
    "paid log orderItem id",
    paidLogs.data[0].orderItem.id,
    orderItemId,
  );
  TestValidator.equals("paid from_status", paidLogs.data[0].from_status, null);
  TestValidator.equals("paid to_status", paidLogs.data[0].to_status, "paid");
  TestValidator.equals(
    "paid pagination records",
    paidLogs.pagination.records,
    1,
  );
}
