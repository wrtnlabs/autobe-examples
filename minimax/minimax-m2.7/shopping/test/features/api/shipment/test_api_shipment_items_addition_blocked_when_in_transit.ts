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

export async function test_api_shipment_items_addition_blocked_when_in_transit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: seller.email,
      password: "password123",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 2. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://example.com" as string & tags.Format<"uri">,
      referrer: "https://google.com" as string & tags.Format<"uri">,
    },
  });
  typia.assert(customer);
  const customerLogin = await authorize_customer_login(customerConnection, {
    body: {
      email: customer.email,
      password: "password123",
      href: "https://example.com" as string & tags.Format<"uri">,
      referrer: "https://google.com" as string & tags.Format<"uri">,
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(customerLogin);
  // 3. Customer creates shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 4. Customer adds products to cart
  // 5. Customer checks out to create order
  const order =
    await generate_random_ecommerce_mall_customer_customers_checkout_create(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        },
      },
    );
  typia.assert(order);
  // Get paid order items for the seller
  const paidOrderItems = order.orderItems.filter(
    (item) => item.status === "paid",
  );
  const otherPaidOrderItems = paidOrderItems.slice(1);
  const firstPaidOrderItem = paidOrderItems[0];
  // 6. Seller creates shipment with tracking information (in-transit state)
  const shipment =
    await generate_random_ecommerce_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: {
          orderId: order.id,
        },
        body: {
          orderItemIds: [firstPaidOrderItem.id],
          carrier: "FedEx",
          trackingNumber: "1234567890",
        },
      },
    );
  typia.assert(shipment);
  // 7. Verify shipment has tracking information (is in 'in transit' state)
  TestValidator.equals("shipment has carrier", shipment.carrier, "FedEx");
  TestValidator.equals(
    "shipment has tracking number",
    shipment.tracking_number,
    "1234567890",
  );
  // 8. Attempt to add more items - should fail because shipment is in transit
  await TestValidator.error(
    "adding items to in-transit shipment should fail",
    async () => {
      await api.functional.ecommerceMall.shipments.items.update(
        sellerConnection,
        {
          shipmentId: shipment.id,
          body: {
            carrier: "FedEx",
            trackingNumber: "1234567890",
            orderItemIds: otherPaidOrderItems.map((item) => item.id),
          } satisfies IEcommerceMallShipment.IUpdate,
        },
      );
    },
  );
}