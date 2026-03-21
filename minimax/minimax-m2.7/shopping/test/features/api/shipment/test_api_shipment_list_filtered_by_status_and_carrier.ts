import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_list_filtered_by_status_and_carrier(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // SCENARIO: Test seller can filter shipments by status and carrier
  // ========================================
  // Generate random password for seller
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  // 1. Register and login seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // Generate random password for customer
  const customerPassword = RandomGenerator.alphaNumeric(16);
  // 2. Register and login customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerAuth.email,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 3. Create multiple products with variants for seller
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product1);
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product2);
  // Get variants from products (assuming variants exist)
  const variant1 = product1.variants[0];
  const variant2 = product2.variants[0];
  // 4. Customer adds items to cart
  const cartItem1 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerLoginConnection,
      {
        body: {
          variant_id: variant1.id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerLoginConnection,
      {
        body: {
          variant_id: variant2.id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  // 5. Prepare checkout
  const checkoutPrepare =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerLoginConnection,
    );
  typia.assert(checkoutPrepare);
  // 6. Confirm checkout to create order
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerLoginConnection,
      {
        body: {
          payment_token: "test_payment_token",
          address_id: checkoutPrepare.shippingAddress?.id,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Get order item IDs from the created order
  const orderItem1 = order.orderItems[0];
  const orderItem2 = order.orderItems[1];
  // 7. Create first shipment with DHL Express carrier
  const shipment1 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerLoginConnection,
      {
        body: {
          orderId: order.id,
          orderItemIds: [orderItem1.id],
          carrier: "DHL Express",
          trackingNumber: "DHL123456",
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment1);
  // 8. Create second shipment with FedEx carrier
  const shipment2 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerLoginConnection,
      {
        body: {
          orderId: order.id,
          orderItemIds: [orderItem2.id],
          carrier: "FedEx",
          trackingNumber: "FDX789012",
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment2);
  // 9. Customer confirms delivery for first shipment
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerLoginConnection,
      {
        orderId: order.id,
        shipmentId: shipment1.id,
      },
    );
  typia.assert(confirmedShipment);
  // ========================================
  // TEST EXECUTION: Filter shipments by status and carrier
  // ========================================
  // Test 1: Filter by status "shipped" - should return shipment2 only (still shipped)
  const shippedResults =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerLoginConnection,
      {
        body: {
          status: "shipped",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(shippedResults);
  TestValidator.equals(
    "shipped filter returns correct count",
    shippedResults.data.length,
    1,
  );
  TestValidator.equals(
    "shipped filter returns FedEx shipment",
    shippedResults.data[0].carrier,
    "FedEx",
  );
  // Test 2: Filter by status "delivered" - should return shipment1 only (delivered)
  const deliveredResults =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerLoginConnection,
      {
        body: {
          status: "delivered",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(deliveredResults);
  TestValidator.equals(
    "delivered filter returns correct count",
    deliveredResults.data.length,
    1,
  );
  TestValidator.equals(
    "delivered filter returns DHL Express shipment",
    deliveredResults.data[0].carrier,
    "DHL Express",
  );
  // Test 3: Filter by carrier "DHL" (partial match)
  const dhlCarrierResults =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerLoginConnection,
      {
        body: {
          carrier: "DHL",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(dhlCarrierResults);
  TestValidator.equals(
    "DHL carrier filter returns correct count",
    dhlCarrierResults.data.length,
    1,
  );
  TestValidator.equals(
    "DHL carrier filter returns DHL Express shipment",
    dhlCarrierResults.data[0].carrier,
    "DHL Express",
  );
  // Test 4: Filter by carrier "FedEx" - should match
  const fedexCarrierResults =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerLoginConnection,
      {
        body: {
          carrier: "FedEx",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(fedexCarrierResults);
  TestValidator.equals(
    "FedEx carrier filter returns correct count",
    fedexCarrierResults.data.length,
    1,
  );
  TestValidator.equals(
    "FedEx carrier filter returns FedEx shipment",
    fedexCarrierResults.data[0].tracking_number,
    "FDX789012",
  );
  // Test 5: Filter by non-existent carrier - should return empty
  const nonExistentCarrierResults =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerLoginConnection,
      {
        body: {
          carrier: "UPS",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(nonExistentCarrierResults);
  TestValidator.equals(
    "UPS carrier filter returns empty",
    nonExistentCarrierResults.data.length,
    0,
  );
  // Test 6: Combined filter - status "delivered" and carrier "DHL"
  const combinedDeliveredDHLResults =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerLoginConnection,
      {
        body: {
          status: "delivered",
          carrier: "DHL",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(combinedDeliveredDHLResults);
  TestValidator.equals(
    "combined delivered+DHL filter returns correct count",
    combinedDeliveredDHLResults.data.length,
    1,
  );
  TestValidator.equals(
    "combined delivered+DHL filter returns DHL Express",
    combinedDeliveredDHLResults.data[0].carrier,
    "DHL Express",
  );
  // Test 7: Combined filter - status "shipped" and carrier "FedEx"
  const combinedShippedFedExResults =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerLoginConnection,
      {
        body: {
          status: "shipped",
          carrier: "Fed",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(combinedShippedFedExResults);
  TestValidator.equals(
    "combined shipped+Fed filter returns correct count",
    combinedShippedFedExResults.data.length,
    1,
  );
  TestValidator.equals(
    "combined shipped+Fed filter returns FedEx",
    combinedShippedFedExResults.data[0].carrier,
    "FedEx",
  );
  // Test 8: Combined filter with no match - should return empty
  const noMatchResults =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerLoginConnection,
      {
        body: {
          status: "delivered",
          carrier: "FedEx",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(noMatchResults);
  TestValidator.equals(
    "delivered+FedEx combined filter returns empty",
    noMatchResults.data.length,
    0,
  );
}
