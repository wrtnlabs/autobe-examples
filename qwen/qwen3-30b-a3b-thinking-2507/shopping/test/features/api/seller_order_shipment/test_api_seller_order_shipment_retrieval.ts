import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_seller_orders_shipments_create";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

export async function test_api_seller_order_shipment_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEcommerceSeller.IJoin,
  });
  // 2. Create a shipment (assuming we have an order ID)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const shipment =
    await generate_random_ecommerce_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { id: orderId },
        body: {
          carrier_name: "USPS",
          tracking_number: "9400100900000000000000",
        } satisfies IEcommerceShipment.ICreate,
      },
    );
  // 3. Retrieve shipment details
  const retrievedShipment =
    await api.functional.ecommerce.seller.orders.shipments.at(
      sellerConnection,
      {
        orderId: orderId,
        shipmentId: shipment.id,
      },
    );
  // 4. Validate response
  typia.assert(retrievedShipment);
  // 5. Validate the shipment details
  TestValidator.equals(
    "carrier name matches",
    retrievedShipment.carrier_name,
    "USPS",
  );
  TestValidator.equals(
    "tracking number matches",
    retrievedShipment.tracking_number,
    "9400100900000000000000",
  );
  TestValidator.predicate(
    "status is 'shipped'",
    retrievedShipment.status === "shipped",
  );
  TestValidator.predicate(
    "shipment_date is valid",
    new Date(retrievedShipment.shipment_date) <= new Date(),
  );
  TestValidator.predicate(
    "expected_delivery_date is valid",
    new Date(retrievedShipment.expected_delivery_date) >
      new Date(retrievedShipment.shipment_date),
  );
  TestValidator.equals(
    "order reference matches",
    retrievedShipment.order.id,
    orderId,
  );
}