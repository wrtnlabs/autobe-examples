import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_admin_orders_shipments_create } from "../../../generate/generate_random_ecommerce_admin_orders_shipments_create";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

export async function test_api_shipment_retrieval_delivered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = typia.assert<IEcommerceAdmin.IAuthorized>(
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
      },
    }),
  );
  // 2. Login as admin
  const orderConnection: api.IConnection = { host: connection.host };
  const orderConnectionResponse = await authorize_admin_login(orderConnection, {
    body: {
      email: admin.email,
      password: "1234",
    },
  });
  // 3. Create shipment with status 'delivered' for order
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const shipment = typia.assert<IEcommerceShipment>(
    await generate_random_ecommerce_admin_orders_shipments_create(
      orderConnection,
      {
        body: {
          carrier: "FedEx",
          tracking_number: RandomGenerator.alphaNumeric(10),
          shipping_date: new Date().toISOString(),
          status: "delivered",
        },
        params: {
          orderId: orderId,
        },
      },
    ),
  );
  // 4. Retrieve shipment
  const retrievedShipment = typia.assert<IEcommerceShipment>(
    await api.functional.ecommerce.admin.orders.shipments.at(orderConnection, {
      orderId: orderId,
      id: shipment.id,
    }),
  );
  // 5. Validate
  TestValidator.equals("status", retrievedShipment.status, "delivered");
  TestValidator.equals("carrier", retrievedShipment.carrier, "FedEx");
  TestValidator.equals(
    "tracking number",
    retrievedShipment.tracking_number,
    shipment.tracking_number,
  );
  TestValidator.notEquals(
    "delivery date should be present",
    retrievedShipment.actual_delivery_date,
    null,
  );
  TestValidator.notEquals(
    "delivery date should be present",
    retrievedShipment.actual_delivery_date,
    undefined,
  );
}
