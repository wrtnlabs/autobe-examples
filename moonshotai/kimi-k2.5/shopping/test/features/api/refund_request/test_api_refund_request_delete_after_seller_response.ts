import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer } from "../../../prepare/prepare_random_ecommerce_mall_customer";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_refund_request_delete_after_seller_response(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate customer and seller with separate connections
  const customerConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  await authorize_seller_join(sellerConnection, {});
  // Step 2: Initial setup - address, product, variant, cart
  await generate_random_ecommerce_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      { body: { productVariantId: variant.id } },
    );
  typia.assert(cartItem);
  // Step 3: Retrieve orders and get order item details
  const orderList = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    { body: {} satisfies IEcommerceMallOrder.IRequest },
  );
  typia.assert(orderList);
  TestValidator.predicate("order list has records", orderList.data.length > 0);
  const orderId = orderList.data[0].id;
  const orderDetails = await api.functional.ecommerceMall.customer.orders.at(
    customerConnection,
    { orderId },
  );
  typia.assert(orderDetails);
  TestValidator.predicate(
    "order has items",
    orderDetails.orderItems.length > 0,
  );
  const orderItemId = orderDetails.orderItems[0].id;
  // Step 4: Create shipment for the order items
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    { body: { orderItemIds: [orderItemId] } },
  );
  typia.assert(shipment);
  // Step 5: Customer confirms delivery
  const deliveryConfirmation =
    await api.functional.ecommerceMall.customer.shipments.delivery.confirm(
      customerConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(deliveryConfirmation);
  // Step 6: Customer creates refund request
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      { body: { orderItemId } },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  // Step 7: Seller responds to refund request (approve it)
  const respondedRequest =
    await api.functional.ecommerceMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "approved",
          responseReason: "Approved by seller",
        } satisfies IEcommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(respondedRequest);
  TestValidator.equals(
    "refund request status is approved",
    respondedRequest.status,
    "approved",
  );
  // Step 8: Customer tries to delete processed refund request - should fail
  await TestValidator.error(
    "cannot delete processed refund request",
    async () => {
      await api.functional.ecommerceMall.customer.refund_requests.erase(
        customerConnection,
        { refundRequestId: refundRequest.id },
      );
    },
  );
}
