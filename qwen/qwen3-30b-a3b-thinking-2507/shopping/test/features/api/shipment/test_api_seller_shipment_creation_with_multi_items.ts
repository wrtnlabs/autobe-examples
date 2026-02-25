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

export async function test_api_seller_shipment_creation_with_multi_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = {
    host: connection.host,
  };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  await authorize_seller_login(sellerConnection, {
    body: {
      email: seller.email,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Customer setup for order creation
  const customerConnection: api.IConnection = {
    host: connection.host,
  };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  await authorize_customer_login(customerConnection, {
    body: {
      email: customer.email,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 3. Create order as customer (using dependency endpoint)
  const orderSummary = await api.functional.ecommerce.customer.orders.index(
    customerConnection,
    {
      body: typia.random<IEcommerceOrder.IRequest>(),
    },
  );
  const order = orderSummary.data[0];
  // 4. Create shipment as seller using utility function
  const trackingNumber = RandomGenerator.alphaNumeric(20);
  const shipment =
    await generate_random_ecommerce_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          carrier_name: "DHL",
          tracking_number: trackingNumber,
        },
        params: {
          id: order.id,
        },
      },
    );
  // 5. Validate shipment details
  typia.assert(shipment);
  TestValidator.equals(
    "shipment carrier matches",
    shipment.carrier_name,
    "DHL",
  );
  TestValidator.equals(
    "shipment tracking number matches",
    shipment.tracking_number,
    trackingNumber,
  );
  TestValidator.equals("order matches", shipment.order.id, order.id);
}
