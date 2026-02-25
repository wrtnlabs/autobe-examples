import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrder";
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
import { generate_random_ecommerce_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_seller_orders_shipments_create";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

export async function test_api_seller_shipment_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account to generate an order
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://example.com",
      referrer: "https://example.com/signup",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // 2. Create a test order as the customer
  const order = await api.functional.ecommerce.customer.orders.index(
    customerConnection,
    {
      body: {
        status: "paid",
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(order);
  // 3. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerpassword123",
      name: RandomGenerator.name(1),
      description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEcommerceSeller.IJoin,
  });
  // 4. Seller logs in
  await authorize_seller_login(sellerConnection, {
    body: {
      email: seller.email,
      password: "sellerpassword123",
    } satisfies IEcommerceSeller.ILogin,
  });
  // 5. Create shipment for the order as the seller
  const trackingNumber = RandomGenerator.alphaNumeric(12);
  const shipment =
    await generate_random_ecommerce_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          carrier_name: "USPS",
          tracking_number: trackingNumber,
        } satisfies IEcommerceShipment.ICreate,
        params: {
          id: order.data[0].id,
        },
      },
    );
  typia.assert(shipment);
  // 6. Validate shipment creation
  TestValidator.equals("shipment status", shipment.status, "shipped");
  TestValidator.equals("carrier name matches", shipment.carrier_name, "USPS");
  TestValidator.equals(
    "tracking number matches",
    shipment.tracking_number,
    trackingNumber,
  );
}
