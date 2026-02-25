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

export async function test_api_seller_order_shipment_delivered_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication via join
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Generate random order ID as UUID
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const shipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve pre-existing 'delivered' shipment (mocked response)
  const retrievedShipment: IEcommerceShipment =
    await api.functional.ecommerce.seller.orders.shipments.at(
      sellerConnection,
      {
        orderId,
        shipmentId,
      },
    );
  typia.assert(retrievedShipment);
  // 4. Validate all required conditions
  TestValidator.equals(
    "shipment status should be 'delivered'",
    retrievedShipment.status,
    "delivered",
  );
  TestValidator.equals("order ID matches", retrievedShipment.order.id, orderId);
  // Verify expected delivery date has passed
  const expectedDeliveryDate = new Date(
    retrievedShipment.expected_delivery_date,
  );
  const now = new Date();
  TestValidator.predicate(
    "expected_delivery_date has passed",
    expectedDeliveryDate < now,
  );
  // Verify tracking number has format (simple length check)
  TestValidator.predicate(
    "tracking number format match",
    retrievedShipment.tracking_number.length > 12,
  );
}
