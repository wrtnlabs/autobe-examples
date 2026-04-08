import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_shipment_tracking_update_forbidden_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as seller A
  const sellerACredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerAJoinResult = await authorize_seller_join(connection, {
    body: sellerACredentials,
  });
  typia.assert(sellerAJoinResult);
  const sellerAConnection: api.IConnection = { host: connection.host };
  sellerAConnection.headers = {
    Authorization: `Bearer ${sellerAJoinResult.token.access}`,
  };
  // 2. Register and login as customer
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerJoinResult = await authorize_customer_join(connection, {
    body: customerCredentials,
  });
  typia.assert(customerJoinResult);
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: `Bearer ${customerJoinResult.token.access}`,
  };
  // 3. Create customer shipping address
  const address =
    await api.functional.ecommerceMall.customer.customers.addresses.create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          streetAddress: `${RandomGenerator.alphabets(5)} Street`,
          city: "Test City",
          state: "Test State",
          postalCode: "12345",
          country: "Test Country",
          isDefault: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  // 4. Add item to cart and checkout - using a pre-existing variant
  // Note: This test assumes there is an existing product/variant in the system
  // For a complete test, you would need to create products first
  const cartItem =
    await api.functional.ecommerceMall.customer.ecommerceMall.cart.items.create(
      customerConnection,
      {
        body: {
          variantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(cartItem);
  // 5. Checkout to create order
  const order =
    await api.functional.ecommerceMall.customer.customers.checkout.create(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // Get the order item ID for shipment creation
  const orderItemId = order.orderItems[0]?.id;
  if (!orderItemId) {
    throw new Error("No order items found in checkout response");
  }
  // 6. Seller A creates shipment for the order
  const shipment =
    await generate_random_ecommerce_mall_seller_orders_shipments_create(
      sellerAConnection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: [orderItemId],
          carrier: "FedEx",
          trackingNumber: "FEDEX123456789",
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 7. Register and login as seller B
  const sellerBCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerBJoinResult = await authorize_seller_join(connection, {
    body: sellerBCredentials,
  });
  typia.assert(sellerBJoinResult);
  const sellerBConnection: api.IConnection = { host: connection.host };
  sellerBConnection.headers = {
    Authorization: `Bearer ${sellerBJoinResult.token.access}`,
  };
  // 8. Seller B attempts to update seller A's shipment - should get 403 Forbidden
  await TestValidator.httpError(
    "seller B cannot update seller A's shipment",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.orders.shipments.update(
        sellerBConnection,
        {
          orderId: order.id,
          shipmentId: shipment.id,
          body: {
            carrier: "UPS",
            trackingNumber: "UPS987654321",
          } satisfies IEcommerceMallShipment.IUpdate,
        },
      );
    },
  );
}
