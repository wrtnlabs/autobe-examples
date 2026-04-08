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

/**
 * Test that a customer cannot delete a refund request created by another customer.
 * When attempting to delete a refund request belonging to a different user,
 * the system should return a 403 forbidden error or 404 not found.
 */
export async function test_api_refund_request_delete_other_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first customer and authenticate
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Auth = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer1Auth);
  // 2. First customer creates a shipping address
  const address =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customer1Connection,
      {},
    );
  typia.assert(address);
  // 3. Create seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 4. Seller creates a product
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: typia.random<string>(),
        description: typia.random<string>(),
        categoryId,
        basePrice: typia.random<number & tags.Minimum<0>>(),
      },
    },
  );
  typia.assert(product);
  // 5. Seller adds a variant to the product
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          options: [
            {
              optionName: "Color",
              optionValue: "Red",
            },
            {
              optionName: "Size",
              optionValue: "Large",
            },
          ],
        },
      },
    );
  typia.assert(variant);
  // 6. First customer adds the product variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customer1Connection,
      {
        body: {
          productVariantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // 7. Trigger order creation by listing orders
  const ordersPage = await api.functional.ecommerceMall.customer.orders.index(
    customer1Connection,
    {
      body: {},
    },
  );
  typia.assert(ordersPage);
  // 8. Get order details to retrieve order item
  const order = await api.functional.ecommerceMall.customer.orders.at(
    customer1Connection,
    {
      orderId: ordersPage.data[0].id,
    },
  );
  typia.assert(order);
  // Get the order item ID from the order
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 9. Seller creates shipment with the order item
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: [orderItem.id],
        carrierName: "FedEx",
        trackingNumber: RandomGenerator.alphaNumeric(10),
      },
    },
  );
  typia.assert(shipment);
  // 10. First customer confirms delivery of the shipment
  const deliveryConfirmation =
    await api.functional.ecommerceMall.customer.shipments.delivery.confirm(
      customer1Connection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveryConfirmation);
  // 11. First customer creates a refund request for the delivered order item
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customer1Connection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: "Product damaged during shipping",
        },
      },
    );
  typia.assert(refundRequest);
  // 12. Create second customer and authenticate
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Auth = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer2Auth);
  // Verify customer IDs are different
  TestValidator.notEquals(
    "customer IDs differ",
    customer1Auth.id,
    customer2Auth.id,
  );
  // 13. Second customer attempts to delete the refund request created by first customer
  // Should fail with 403 Forbidden or 404 Not Found
  await TestValidator.error(
    "second customer cannot delete first customer's refund request",
    async () => {
      await api.functional.ecommerceMall.customer.refund_requests.erase(
        customer2Connection,
        {
          refundRequestId: refundRequest.id,
        },
      );
    },
  );
}
